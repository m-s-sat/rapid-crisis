import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const verifyToken = (req: Request, res: Response, next: NextFunction): any => {
    // Check both cookie and header for backwards compatibility during migration
    const token = req.cookies?.accessToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
        (req as any).adminId = decoded.sub;
        (req as any).venueId = decoded.venueId;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid token" });
    }
};
