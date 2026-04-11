import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/admin.model.js";
import Venue from "../models/venue.model.js";
import { env } from "../config/env.js";

const generateTokens = (adminId: string, venueId: string) => {
    const accessToken = jwt.sign({ id: adminId, venueId }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: adminId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<any> => {
    try {
        const { 
            venueName, 
            location, 
            hospitality_type, 
            contact_number,
            adminName,
            email,
            password 
        } = req.body;

        const existing = await Admin.findOne({ email });
        if (existing) return res.status(400).json({ message: "Admin email already exists" });

        const venue = await Venue.create({
            name: venueName,
            location,
            hospitality_type,
            contact_number
        });

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = await Admin.create({
            name: adminName,
            email, 
            password_hash: hashedPassword,
            venue_id: venue._id
        });

        const { accessToken, refreshToken } = generateTokens(admin._id as any, venue._id as any);
        admin.refresh_token = refreshToken;
        await admin.save();

        res.status(201).json({
            success: true,
            accessToken,
            refreshToken,
            venue_id: venue._id,
            admin: { name: admin.name, email: admin.email }
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(401).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const { accessToken, refreshToken } = generateTokens(admin._id as any, admin.venue_id.toString());
        admin.refresh_token = refreshToken;
        await admin.save();

        res.json({
            success: true,
            accessToken,
            refreshToken,
            venue_id: admin.venue_id,
            admin: { name: admin.name, email: admin.email }
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token } = req.body;
        if (!token) return res.status(401).json({ message: "Refresh token required" });

        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
        const admin = await Admin.findById(decoded.id);

        if (!admin || admin.refresh_token !== token) {
            return res.status(403).json({ message: "Invalid or expired refresh token" });
        }

        const tokens = generateTokens(admin._id as any, admin.venue_id.toString());
        admin.refresh_token = tokens.refreshToken;
        await admin.save();

        res.json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    } catch (err: any) {
        res.status(403).json({ message: "Invalid refresh token" });
    }
};
