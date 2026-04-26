import { Hono } from 'hono';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient } from 'mongodb';

type Bindings = {
  GOOGLE_API_KEY: string;
  GEMINI_MODEL: string;
  PRIMARY_API: any;
  MONGO_URI: string;
  MONGO_DATABASE: string;
};

let cachedClient: MongoClient | null = null;

async function getMongoClient(uri: string) {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri, {
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
  } as any);
  cachedClient = await client.connect();
  return cachedClient;
}

const app = new Hono<{ Bindings: Bindings }>();

function deterministicClassification(sensors: any, zone: string) {
  const temp = sensors.temperature_c || 0;
  const smoke = sensors.smoke_ppm || 0;
  if (temp > 45 || smoke > 350) {
    return {
      crisis_detected: true,
      crisis_type: "fire",
      confidence_score: 0.95,
      summary: `Fire detected in ${zone}.`,
      reasoning: "Hardware threshold exceeded (Edge Fallback)"
    };
  }
  return { crisis_detected: false, crisis_type: "other", confidence_score: 0, summary: "Normal", reasoning: "None" };
}

app.post('/process', async (c) => {
  const evidence = await c.req.json();
  const { venue_id, sensors, location } = evidence;
  const zone = location?.zone || "unknown";

  const genAI = new GoogleGenerativeAI(c.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: c.env.GEMINI_MODEL || "gemini-1.5-flash" });

  let classification;
  try {
    const prompt = `Analyze sensor data and classify the situation. Data: ${JSON.stringify(sensors)} Location: ${zone}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    classification = jsonMatch ? JSON.parse(jsonMatch[0]) : deterministicClassification(sensors, zone);
  } catch (err) {
    classification = deterministicClassification(sensors, zone);
  }

  if (classification.crisis_detected) {
    const client = await getMongoClient(c.env.MONGO_URI);
    const db = client.db(c.env.MONGO_DATABASE || "sentinel_ai");
    const collection = db.collection("ai_responses");
    
    const mongoRes = await collection.insertOne({
      ...classification,
      venue_id,
      zone,
      created_at: new Date().toISOString()
    });

    await c.env.PRIMARY_API.fetch(new Request('https://internal/internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id,
        type: 'crisis_detected',
        payload: {
            ...classification,
            mongo_id: mongoRes.insertedId,
            zone
        }
      })
    }));
  }

  return c.json({ status: 'processed', classification });
});

export default app;
