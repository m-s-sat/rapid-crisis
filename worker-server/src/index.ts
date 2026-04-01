import { redisManagerInstance } from "./db/redis.js";
import twilio from "twilio";
import { env } from "./config/env.js";

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

async function handleApprovedPayload(payload: any, redisClient: any) {
    const venue = payload.venue_details;
    const crisis = payload.crisis_details;
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
        crisis_id: crisis._id
    }));
}

async function startWorker() {
    try {
        const client = await redisManagerInstance.init();
        if (!client) {
            console.error("Failed to connect to redis");
            process.exit(1);
        }

        console.log("Worker started, listening for tasks...");

        while (true) {
            const result = await client.brPop(["ai_response", "admin_approved"], 0);
            if (!result) continue;

            const { key, element } = result;
            const payload = JSON.parse(element);

            if (key === "admin_approved") {
                await handleApprovedPayload(payload, client);
            } else if (key === "ai_response") {
                let score = payload.confidence_score;
                if (score > 1) {
                    score = score / 100;
                }

                if (score >= 0.70) {
                    await handleApprovedPayload(payload, client);
                } else if (score >= 0.40) {
                    await client.publish("messaging_status", JSON.stringify({
                        type: "decided_by_admin",
                        venue_id: payload.venue_details._id,
                        payload: payload
                    }));
                } else {
                    console.log(`Ignoring payload with low confidence score: ${score}`);
                }
            }
        }
    } catch (err) {
        console.error("Worker error:", err);
        process.exit(1);
    }
}

startWorker();