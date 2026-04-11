import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = new Resend(env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  
  try {
    await resend.emails.send({
      from: "Auth <auth@yourdomain.com>",
      to: email,
      subject: "Reset your password",
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  } catch (err) {
    console.error("Error sending password reset email:", err);
    // In production, you might not want to throw to prevent enumeration,
    // but the controller handles this by always returning 200.
  }
};

export const sendPasswordChangedEmail = async (email: string) => {
  try {
    await resend.emails.send({
      from: "Auth <auth@yourdomain.com>",
      to: email,
      subject: "Password changed successfully",
      html: `
        <h1>Password Changed</h1>
        <p>Your password has been changed successfully. If you did not perform this action, please contact support immediately.</p>
      `,
    });
  } catch (err) {
    console.error("Error sending password changed email:", err);
  }
};
