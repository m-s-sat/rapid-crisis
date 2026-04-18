import type { Request, Response } from "express";
import { redisManagerInstance } from "../db/redis.js";
import { activeTimeouts } from "../index.js";

export async function adminDecision(req: Request, res: Response): Promise<any> {
    try {
        const { action, payload } = req.body;
        
        if (!payload || !payload.crisis_details || !payload.venue_details) {
            return res.status(400).json({ success: false, message: "Invalid payload provided" });
        }

        const requesterVenueId = String((req as any).venueId || "");
        const targetVenueId = String(
            payload.venue_id ||
            payload.venue_details?._id ||
            ""
        );

        if (requesterVenueId && targetVenueId && requesterVenueId !== targetVenueId) {
            return res.status(403).json({ success: false, message: "You cannot manage alerts for another venue" });
        }

        const crisisId = payload.crisis_details._id || payload.crisis_details;

        const existingTimeout = activeTimeouts.get(crisisId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            activeTimeouts.delete(crisisId);
        }

        if (action === 'approve') {
            const redisClient = await redisManagerInstance.getClient();
            if (!redisClient) {
                return res.status(500).json({ success: false, message: "Redis unavailable" });
            }
            
            await redisClient.lPush("admin_approved", JSON.stringify(payload));
            return res.json({ success: true, message: "Admin approved. Tasks pushed." });
        } else if (action === 'cancel') {
            const redisClient = await redisManagerInstance.getClient();
            if (redisClient) {
                await redisClient.publish("messaging_status", JSON.stringify({
                    type: "resume",
                    venue_id: targetVenueId || undefined
                }));
            }
            return res.json({ success: true, message: "Admin safely cancelled the alert." });
        } else {
            return res.status(400).json({ success: false, message: "Invalid action. Use approve or cancel." });
        }
    } catch (err) {
        console.error("Admin decision error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}
