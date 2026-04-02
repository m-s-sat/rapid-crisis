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

async function sendAlerts(venue: any, crisis: any, redisClient: any) {
    const body = `CRITICAL ALERT: A ${crisis.type} crisis has been confirmed at ${venue.name}. Please follow emergency procedures.`;

    if (venue.guest_details && Array.isArray(venue.guest_details)) {
        for (const guest of venue.guest_details) {
            if (guest.phoneNumber) {
                await sendSms(guest.phoneNumber, body);
            }
        }
    }

    if (venue.staff_details) {
        const staffList = Object.values(venue.staff_details);
        for (const staff of staffList) {
            const s = staff as any;
            if (s.phoneNumber) {
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
    await sendAlerts(payload.venue_details, payload.crisis_details, redisClient);
}

async function handleAiResult(result: any, redisClient: any) {
    if (!result.crisis_detected) return;

    const venueId = result.venue_id;
    const zone = result.zone;
    const crisisType = result.crisis_type;
    const confidence = result.confidence_score ?? 0;
    const venueDetails = result.venue_details;
    const crisisDetails = result.crisis_details;
    const mongoResponseId = result.mongo_response_id || "";

    const existing = await getActiveSession(redisClient, venueId, zone, crisisType);

    if (existing) {
        const updated = await updateSession(redisClient, venueId, zone, crisisType, confidence);
        if (!updated) return;

        console.log(
            `[DEDUP] ${crisisType}@${zone} | reading #${updated.reading_count} | ` +
            `peak=${updated.peak_confidence} | sms_sent=${updated.sms_sent}`
        );

        if (updated.peak_confidence >= 0.70 && !updated.sms_sent && venueDetails && crisisDetails) {
            console.log(`[ESCALATION] ${crisisType}@${zone} crossed 0.70 threshold`);
            await sendAlerts(venueDetails, crisisDetails, redisClient);
            await markSmsSent(redisClient, venueId, zone, crisisType);
        }

        return;
    }

    console.log(`[NEW CRISIS] ${crisisType}@${zone} | confidence=${confidence}`);
    const session = await createSession(redisClient, venueId, zone, crisisType, confidence, mongoResponseId);

    if (confidence >= 0.70) {
        if (venueDetails && crisisDetails) {
            await sendAlerts(venueDetails, crisisDetails, redisClient);
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
                crisis_session_id: session.crisis_session_id,
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
            const result = await client.brPop(
                ["ai_result_queue", "admin_approved"],
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