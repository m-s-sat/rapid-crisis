/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import type { Context } from 'hono';

type Bindings = {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  PRIMARY_API: any;
};

const app = new Hono<{ Bindings: Bindings }>();

async function sendSms(to: string, body: string, env: Bindings) {
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: env.TWILIO_PHONE_NUMBER,
        Body: body,
      }),
    }
  );
  return res.json();
}

app.post('/alert', async (c: Context<{ Bindings: Bindings }>) => {
  const payload = await c.req.json();
  const { venue_details, crisis_details, zone, confidence_score } = payload;
  const venueId = venue_details?._id || "unknown";
  const crisisType = crisis_details?.type || "unknown";

  const dedupKey = `alert:dedup:${venueId}:${zone}:${crisisType}`;
  const redisRes = await fetch(`${c.env.UPSTASH_REDIS_REST_URL}/get/${dedupKey}`, {
    headers: { Authorization: `Bearer ${c.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  const existing = (await redisRes.json() as any).result;

  if (existing && confidence_score < 0.9) {
    return c.json({ status: 'skipped', reason: 'Deduplicated' });
  }

  const messageBody = `SENTINEL ALERT: ${crisisType.toUpperCase()} in ${zone} at ${venue_details?.name}. Status: ${confidence_score > 0.7 ? 'CRITICAL' : 'ADMIN REVIEW'}.`;
  
  if (venue_details?.staff_details?.[0]?.phoneNumber) {
     await sendSms(venue_details.staff_details[0].phoneNumber, messageBody, c.env);
  }

  await fetch(`${c.env.UPSTASH_REDIS_REST_URL}/set/${dedupKey}/active?ex=300`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.env.UPSTASH_REDIS_REST_TOKEN}` }
  });

  await c.env.PRIMARY_API.fetch(new Request('https://internal/internal/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venue_id: venueId,
      type: 'sent',
      message: 'Emergency alerts dispatched via Cloudflare Edge.'
    })
  }));

  return c.json({ status: 'sent' });
});

export default app;
