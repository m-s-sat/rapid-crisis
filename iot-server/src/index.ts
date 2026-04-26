/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';

type Bindings = {
  AI_SERVICE: any;
  PRIMARY_API: any;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  NUM_DEVICES: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const ZONES = ["lobby", "kitchen", "hallway", "server_room"];
const deviceStates = new Map<string, any>();

function getReading(deviceId: string) {
  let state = deviceStates.get(deviceId) || { temp: 32, smoke: 5 };
  
  state.temp += (Math.random() - 0.5) * 1.0;
  state.smoke += (Math.random() - 0.5) * 2.0;

  if (Math.random() < 0.005) {
    state.temp = 60 + Math.random() * 20;
    state.smoke = 400 + Math.random() * 100;
  }

  deviceStates.set(deviceId, state);
  return state;
}

async function simulate(env: Bindings) {
  const numDevices = parseInt(env.NUM_DEVICES || "3");
  const startTime = Date.now();
  
  while (Date.now() - startTime < 55000) {
    const redisRes = await fetch(`${env.UPSTASH_REDIS_REST_URL}/get/telemetry_pause`, {
      headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` }
    });
    const isPaused = (await redisRes.json() as any).result === "true";

    if (!isPaused) {
      for (let i = 1; i <= numDevices; i++) {
        const deviceId = `EDGE-ESP32-${i}`;
        const state = getReading(deviceId);
        const payload = {
          venue_id: "global-venue",
          device_id: deviceId,
          sensors: { temperature_c: state.temp, smoke_ppm: state.smoke },
          location: { zone: ZONES[i % ZONES.length] },
          timestamp: new Date().toISOString()
        };

        await env.AI_SERVICE.fetch(new Request('https://internal/process', {
          method: 'POST',
          body: JSON.stringify(payload)
        }));

        await env.PRIMARY_API.fetch(new Request('https://internal/internal/broadcast', {
          method: 'POST',
          body: JSON.stringify({
            venue_id: payload.venue_id,
            type: 'sensor_data',
            payload
          })
        }));
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(simulate(env));
  },
  
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(simulate(env));
    return new Response("Simulation Started", { status: 200 });
  }
};
