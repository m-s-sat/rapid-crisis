import { redisManagerInstance } from "./db/redis.js";
import twilio from "twilio";
import { env } from "./config/env.js";
import {
    getActiveSession,
    createSession,
    updateSession,
    markSmsSent,
    markAdminNotified,
} from "./services/dedup.service.js";
import { generateBody } from "./services/messaging.service.js";

const twilioClient = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;

async function sendSms(to: string, body: string) {
    if (!twilioClient) {
        console.log(`[SIMULATED SMS] To: ${to} - Body: ${body}`);
        return;
    }
    try {
        await twilioClient.messages.create({
            body,
            from: typeof env.TWILIO_PHONE_NUMBER === "string" ? env.TWILIO_PHONE_NUMBER : JSON.stringify(env.TWILIO_PHONE_NUMBER),
            to,
        });
    } catch (err: any) {
        console.error("SMS error:", err?.message || err);
    }
}

async function sendAlerts(venue: any, crisis: any, zone: string, redisClient: any) {
    if (venue.guest_details && Array.isArray(venue.guest_details)) {
        const guestBody = generateBody(venue.name, zone, crisis.type, "guest", crisis.safety_measures, crisis.description);
        for (const guest of venue.guest_details) {
            if (guest.phoneNumber) {
                await sendSms(guest.phoneNumber, guestBody);
            }
        }
    }

    if (venue.staff_details) {
        const staffList = Object.values(venue.staff_details);
        for (const staff of staffList) {
            const s = staff as any;
            if (s.phoneNumber && (s.expertise === "all" || s.expertise === crisis.type)) {
                const role = s.expertise === "all" ? "admin" : "staff";
                const body = generateBody(venue.name, zone, crisis.type, role, crisis.safety_measures, crisis.description);
                await sendSms(s.phoneNumber, body);
            }
        }
    }

    await redisClient.publish("messaging_status", JSON.stringify({
        type: "sent",
        venue_id: venue._id,
        crisis_id: crisis._id,
    }));
}

async function handleAdminApproved(payload: any, redisClient: any) {
    const zone = payload.zone || (Array.isArray(payload.zones) ? payload.zones[0] : "unknown");
    console.log(`[ADMIN APPROVED] Sending alerts for ${payload.crisis_details?.type || "unknown"} at ${zone}`);
    await sendAlerts(payload.venue_details, payload.crisis_details, zone, redisClient);
    console.log(`[ADMIN APPROVED] Alerts dispatched successfully.`);
}

async function handleAiResult(result: any, redisClient: any) {
    if (!result.crisis_detected) return;

    const venueId = result.venue_id;
    const zone = result.zone;
    const crisisType = result.crisis_type;
    const confidence = result.confidence_score ?? 0;
    const venueDetails = result.venue_details;
    const crisisDetails = result.crisis_details || {
        _id: "fallback_" + crisisType,
        type: crisisType,
        safety_measures: ["System triggered manual override. Please investigate."],
        description: "Unmapped structural detection.",
    };
    const mongoResponseId = result.mongo_response_id || "";

    const existing = await getActiveSession(redisClient, venueId, zone, crisisType);

    if (existing) {
        const updated = await updateSession(redisClient, venueId, zone, crisisType, confidence);
        if (!updated) return;

        console.log(
            `[DEDUP] ${crisisType}@${zone} | reading #${updated.reading_count} | ` +
            `peak=${updated.peak_confidence} | sms_sent=${updated.sms_sent}`
        );

        if (updated.peak_confidence >= 0.70 && !updated.sms_sent) {
            if (venueDetails) {
                console.log(`[ESCALATION] ${crisisType}@${zone} crossed 0.70 threshold. Sending alerts.`);
                const mappedCrisis = crisisDetails || { type: crisisType };
                await sendAlerts(venueDetails, mappedCrisis, zone, redisClient);
                await markSmsSent(redisClient, venueId, zone, crisisType);
            }
        } else if (updated.peak_confidence >= 0.40 && !updated.admin_notified) {
            await redisClient.publish("messaging_status", JSON.stringify({
                type: "decided_by_admin",
                venue_id: venueId,
                payload: {
                    venue_details: venueDetails,
                    crisis_details: crisisDetails,
                    confidence_score: updated.peak_confidence,
                    status: "active",
                    zones: [zone],
                    crisis_type: crisisType,
                    crisis_session_id: updated.crisis_session_id,
                    source_timestamp: result.source_timestamp,
                    analysis_duration: result.analysis_duration,
                    trigger_sensors: result.trigger_sensors,
                    reasoning: result.reasoning,
                    summary: result.summary,
                },
            }));
            await markAdminNotified(redisClient, venueId, zone, crisisType);
        }

        return;
    }

    console.log(`[NEW CRISIS] ${crisisType}@${zone} | confidence=${confidence} | took ${result.analysis_duration}s`);
    const session = await createSession(redisClient, venueId, zone, crisisType, confidence, mongoResponseId);

    if (confidence >= 0.70) {
        if (venueDetails && crisisDetails) {
            await sendAlerts(venueDetails, crisisDetails, zone, redisClient);
            await markSmsSent(redisClient, venueId, zone, crisisType);
        }
    } else if (confidence >= 0.40) {
        await redisClient.publish("messaging_status", JSON.stringify({
            type: "decided_by_admin",
            venue_id: venueId,
            payload: {
                venue_details: venueDetails,
                crisis_details: crisisDetails,
                confidence_score: confidence,
                status: "active",
                zones: [zone],
                crisis_type: crisisType,
                crisis_session_id: session.crisis_session_id,
                source_timestamp: result.source_timestamp,
                analysis_duration: result.analysis_duration,
                trigger_sensors: result.trigger_sensors,
                reasoning: result.reasoning,
                summary: result.summary,
            },
        }));
        await markAdminNotified(redisClient, venueId, zone, crisisType);
    } else {
        console.log(`[IGNORED] ${crisisType}@${zone} | confidence ${confidence} too low`);
    }
}

async function startWorker() {
    try {
        const client = await redisManagerInstance.init();
        if (!client) {
            console.error("Failed to connect to redis");
            process.exit(1);
        }

        console.log("Worker started, listening on: ai_result_queue, admin_approved");

        while (true) {
            // admin_approved MUST be listed first — brPop returns from the first
            // non-empty key in order. If ai_result_queue is listed first, admin
            // approvals get starved because the AI queue is always populated.
            const result = await client.brPop(
                ["admin_approved", "ai_result_queue"],
                0
            );
            if (!result) continue;

            const { key, element } = result;
            const payload = JSON.parse(element);

            if (key === "admin_approved") {
                await handleAdminApproved(payload, client);
            } else if (key === "ai_result_queue") {
                await handleAiResult(payload, client);
            }
        }
    } catch (err) {
        console.error("Worker error:", err);
        process.exit(1);
    }
}

startWorker();