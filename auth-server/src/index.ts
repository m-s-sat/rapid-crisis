import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { MongoClient } from 'mongodb';

type Bindings = {
  MONGO_URI: string;
  MONGO_DATABASE: string;
};

let cachedClient: MongoClient | null = null;

async function getMongoClient(uri: string) {
  if (cachedClient) return cachedClient;
  console.log("🔌 Connecting with Native Driver...");
  
  const client = new MongoClient(uri, { 
    maxPoolSize: 1,
    minPoolSize: 0,
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  } as any);
  
  cachedClient = await client.connect();
  console.log("✅ Native Driver Connected!");
  return cachedClient;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({ origin: '*', credentials: true }));

app.post('/api/auth/register', async (c) => {
  try {
    const userData = await c.req.json();
    const client = await getMongoClient(c.env.MONGO_URI);
    const db = client.db(c.env.MONGO_DATABASE || "sentinel_ai");
    
    const result = await db.collection("users").insertOne({
      ...userData,
      role: 'admin',
      created_at: new Date().toISOString()
    });

    return c.json({ success: true, userId: result.insertedId });
  } catch (err: any) {
    console.error("DB Error:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email } = await c.req.json();
    const client = await getMongoClient(c.env.MONGO_URI);
    const db = client.db(c.env.MONGO_DATABASE || "sentinel_ai");
    const user = await db.collection("users").findOne({ email });

    if (!user) return c.json({ error: 'User not found' }, 404);
    
    return c.json({ 
      accessToken: "temp_token",
      user: { email: user.email, role: user.role }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/', (c) => c.text('Sentinel AI Auth API (Native Driver Edition)'));

export default app;
