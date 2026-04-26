import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { MongoClient } from 'mongodb';

type Bindings = {
  MONGO_URI: string;
  MONGO_DATABASE: string;
  JWT_ACCESS_SECRET: string;
  FRONTEND_URL: string;
};

let cachedClient: MongoClient | null = null;

async function getMongoClient(uri: string) {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri, { maxPoolSize: 1 });
  cachedClient = await client.connect();
  return cachedClient;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', secureHeaders());
app.use('*', async (c, next) => {
  const corsMiddleware = cors({ origin: c.env.FRONTEND_URL || '*', credentials: true });
  return corsMiddleware(c, next);
});

app.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const client = await getMongoClient(c.env.MONGO_URI);
  const db = client.db(c.env.MONGO_DATABASE || "sentinel_ai");
  const user = await db.collection("users").findOne({ email });

  if (!user) return c.json({ error: 'User not found' }, 404);
  
  // Logic to verify password and issue JWT...
  return c.json({ message: 'Login logic goes here' });
});

app.get('/', (c) => c.text('Sentinel AI Auth API (Edge-Native)'));

export default app;
