import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import redis from "../db/redis.js";

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
        
        // Fail-secure: if Redis is unreachable, deny the request (as per requirement)
        if (redis.status !== "ready") {
            return res.status(503).json({ message: "Authentication service temporarily unavailable" });
        }

        // Check blocklist
        const isBlocked = await redis.get(`blocklist:${decoded.jti}`);
        if (isBlocked) {
            return res.status(401).json({ message: "Token has been revoked" });
        }

        (req as any).adminId = decoded.id;
        (req as any).venueId = decoded.venueId;
        (req as any).jti = decoded.jti; // Store for logout
        
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid token" });
    }
};
