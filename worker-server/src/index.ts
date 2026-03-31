import { connectToPg } from "./db/pg.js";
import { connectToRedis } from "./db/redis.js";
import type { aiResponse, guestDetails, pgSaveData } from "./schema/ai_response.js";

async function processAiResponse(aiResponse: aiResponse){
    try{
        const pool = await connectToPg();
        if(!pool) return null;
        const tempGuests: guestDetails[] = [
            {
                name: "Mrinal Satyarthi",
                phoneNumber: "7645054550"
            },
            {
                name: "Mrinal Satyarthi",
                phoneNumber: "7645054550"
            }
        ]
        const data: pgSaveData = {
            id: crypto.randomUUID(),
            crisis_type: aiResponse.crisis_type,
            confidence_score: aiResponse.confidence_score,
            vernue_type: aiResponse.venue_type,
            venue_name: aiResponse.venue_name,
            guests: tempGuests,
            messages_status: 'pending',
            created_at: new Date(),
            updated_at: new Date(),
        }
        const insertQuery = `INSERT INTO ai_response (id, crisis_type, confidence_score, vernue_type, venue_name, messages_status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
        const values = [data.id, data.crisis_type, data.confidence_score, data.vernue_type, data.venue_name, data.messages_status, data.created_at, data.updated_at]
        const result = await pool.query(insertQuery, values);
        if(!result.rowCount) return null;

        if(data.confidence_score > 0.7){
            const messagingClient = await connectToRedis();
            if(!messagingClient) return null;
            await messagingClient.lPush("messaging_queue", JSON.stringify(data));
        }
        return data;
    }
    catch(err: any){
        console.error("Error processing ai response: ", err);
        return null;
    }
}

async function startWorkerFunction(){
    try{
        const client = await connectToRedis();
        if(!client){
            console.error("Failed to connect to redis");
            process.exit(1);
        }
        const takeAiResponse = await client.brPop("ai_response",0);
        if(!takeAiResponse){
            console.error("Failed to take ai response from queue");
            process.exit(1);
        }
        const aiResponse: aiResponse = JSON.parse(takeAiResponse.element);
        await processAiResponse(aiResponse);
        
    }
    catch(err){
        console.error("Error starting worker function: ", err);
        process.exit(1);
    }
}

startWorkerFunction();