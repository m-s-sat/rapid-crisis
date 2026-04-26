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
  const client = new MongoClient(uri, { 
    maxPoolSize: 1,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5000,
  } as any);
  cachedClient = await client.connect();
  return cachedClient;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', secureHeaders());
app.use('*', async (c, next) => {
  const corsMiddleware = cors({ 
    origin: '*', 
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  });
  return corsMiddleware(c, next);
});

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

    return c.json({ 
      success: true, 
      userId: result.insertedId,
      accessToken: "temp_token_for_registration", // In production, issue a real JWT
      user: { email: userData.email, role: 'admin' }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  const client = await getMongoClient(c.env.MONGO_URI);
  const db = client.db(c.env.MONGO_DATABASE || "sentinel_ai");
  const user = await db.collection("users").findOne({ email });

  if (!user) return c.json({ error: 'User not found' }, 404);
  
  return c.json({ 
    accessToken: "temp_token_for_login",
    user: { email: user.email, role: user.role }
  });
});

app.get('/api/auth/me', (c) => c.json({ status: 'ok' }));

app.get('/', (c) => c.text('Sentinel AI Auth API (Edge-Native)'));

export default app;
