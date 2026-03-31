import twilio from "twilio";
import { env } from "./config/env.js";
import { connectToRedis } from "./db/redis.js";
import type { guestDetails, pgSaveData } from "./schema/ai_response.js";

const client = twilio(
    env.TWILIO_ACCOUNT_SID,
    env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string) {
  try {
    const message = await client.messages.create({
      body,
      from: env.TWILIO_PHONE_NUMBER,
      to,
    });

    console.log("Twilio SMS sent:", message.sid);
    return message;
  } catch (error: any) {
    console.error("Twilio SMS error:", error?.message || error);
    return null;
  }
}

export async function pickUpClient(){
    try{
        const client = await connectToRedis();
        if(!client){
            console.error("Failed to connect to redis");
            return null;
        }
        const data = await client.brPop("messaging_queue", 0);
        if(!data){
            console.error("Failed to pick up messages from queue");
            return null;
        }
        const parsed_data: pgSaveData = JSON.parse(data.element);
        parsed_data.guests.forEach((guest: guestDetails) => {
            sendSMS(guest.phoneNumber, `Hello ${guest.name}, there is a ${parsed_data.crisis_type} at ${parsed_data.venue_name}`);
        });
        await client.publish("messaging_status", JSON.stringify({
            id: parsed_data.id,
            status: "sent"
        }));
        return;
    }
    catch(err: any){
        console.error("Error picking up messages: ", err);
        return null;
    }
}

pickUpClient();