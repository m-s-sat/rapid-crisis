import { rateLimit } from "express-rate-limit";

// Rate limit: 5 attempts / 15 min / IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit: 3 requests / 15 min / IP
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many password reset requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
