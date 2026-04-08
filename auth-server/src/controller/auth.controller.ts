import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../models/admin.model.js";
import { env } from "../config/env.js";
import redis from "../db/redis.js";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "../utils/email.js";

import Venue from "../models/venue.model.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_REDIS_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const RESET_REDIS_EXPIRY = 15 * 60; // 15 minutes in seconds

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // Always secure as per strategy
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000, 
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/api/auth", // Changed from "/api/auth/refresh" to allow logout to see it too
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const generateTokens = (adminId: string, venueId: string) => {
  const jti = crypto.randomUUID();
  const accessToken = jwt.sign({ sub: adminId, venueId, jti }, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign({ sub: adminId }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken, jti };
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

    // 1. Create Venue
    const venue = await Venue.create({
      name: venueName,
      location,
      hospitality_type,
      contact_number,
    });

    // 2. Create Admin linked to Venue
    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await Admin.create({
      name: adminName,
      email,
      password_hash: hashedPassword,
      venue_id: venue._id,
    });

    // 3. Issue tokens for immediate login
    const tokens = generateTokens(admin._id.toString(), venue._id.toString());
    await redis.set(`refresh:${admin._id}`, hashToken(tokens.refreshToken), "EX", REFRESH_REDIS_EXPIRY);

    res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      accessToken: tokens.accessToken,
      admin: { name: admin.name, email: admin.email },
      venue_id: venue._id.toString(),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    if (redis.status !== "ready") return res.status(503).json({ message: "Auth service unavailable" });

    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select("+password_hash");
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const { accessToken, refreshToken } = generateTokens(admin._id.toString(), admin.venue_id.toString());
    
    // Store hashed refresh token in Redis
    await redis.set(`refresh:${admin._id}`, hashToken(refreshToken), "EX", REFRESH_REDIS_EXPIRY);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ 
      success: true, 
      accessToken,
      admin: { name: admin.name, email: admin.email },
      venue_id: admin.venue_id.toString()
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<any> => {
  try {
    if (redis.status !== "ready") return res.status(503).json({ message: "Auth service unavailable" });

    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "Refresh token required" });

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
    const adminId = decoded.sub;

    const storedHash = await redis.get(`refresh:${adminId}`);
    if (!storedHash || storedHash !== hashToken(token)) {
      // Potential theft or reuse - revoke all
      await redis.del(`refresh:${adminId}`);
      res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(401).json({ message: "User no longer exists" });

    // Rotate tokens
    const tokens = generateTokens(admin._id.toString(), admin.venue_id.toString());
    await redis.set(`refresh:${adminId}`, hashToken(tokens.refreshToken), "EX", REFRESH_REDIS_EXPIRY);

    res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ 
      success: true, 
      accessToken: tokens.accessToken,
      admin: { name: admin.name, email: admin.email },
      venue_id: admin.venue_id.toString()
    });
  } catch (err: any) {
    res.status(401).json({ message: "Invalid session" });
  }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
      await redis.del(`refresh:${decoded.sub}`);
    }

    // Blocklist the current access token jti if it was provided
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    if (accessToken) {
      try {
        const decodedAccess = jwt.verify(accessToken, env.JWT_ACCESS_SECRET) as any;
        const remainingTTL = Math.max(0, Math.floor((decodedAccess.exp * 1000 - Date.now()) / 1000));
        if (remainingTTL > 0) {
          await redis.set(`blocklist:${decodedAccess.jti}`, "1", "EX", remainingTTL);
        }
      } catch (e) { /* ignore invalid access token */ }
    }

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    res.json({ success: true });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    // ALWAYS return 200 to prevent enumeration
    res.json({ success: true, message: "If an account exists, a reset link has been sent." });

    const admin = await Admin.findOne({ email });
    if (!admin) return;

    const resetToken = crypto.randomBytes(32).toString("hex");
    await redis.set(`reset:${resetToken}`, admin._id.toString(), "EX", RESET_REDIS_EXPIRY);

    await sendPasswordResetEmail(email, resetToken);
  } catch (err) {
    console.error("Forgot password error:", err);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, newPassword } = req.body;

    const adminId = await redis.get(`reset:${token}`);
    if (!adminId) return res.status(410).json({ message: "Link expired or invalid" });

    // Validate password (simple check for now)
    if (newPassword.length < 8) return res.status(400).json({ message: "Password too short" });

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await Admin.findByIdAndUpdate(adminId, { password_hash: hashedPassword });

    // Cleanup
    await redis.del(`reset:${token}`);
    await redis.del(`refresh:${adminId}`); // Force re-login on all devices

    const admin = await Admin.findById(adminId);
    if (admin) await sendPasswordChangedEmail(admin.email);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error resetting password" });
  }
};

export const me = async (req: Request, res: Response): Promise<any> => {
    try {
        const adminId = (req as any).adminId;
        const admin = await Admin.findById(adminId);
        if (!admin) return res.status(404).json({ message: "Not found" });
        res.json({ success: true, admin: { name: admin.name, email: admin.email, venue_id: admin.venue_id } });
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
};
