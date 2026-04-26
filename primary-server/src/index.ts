import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CrisisState } from './db/durable_object.js';

type Bindings = {
  CRISIS_STATE: DurableObjectNamespace;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: '*', 
  credentials: true,
}));

app.get('/ws', async (c) => {
  const venueId = c.req.query('venue_id');
  if (!venueId) return c.text('Missing venue_id', 400);

  const id = c.env.CRISIS_STATE.idFromName(venueId);
  const obj = c.env.CRISIS_STATE.get(id);

  return obj.fetch(c.req.raw);
});

app.post('/internal/broadcast', async (c) => {
  const body = await c.req.json();
  const { venue_id } = body;

  if (!venue_id) return c.json({ error: 'Missing venue_id' }, 400);

  const id = c.env.CRISIS_STATE.idFromName(venue_id);
  const obj = c.env.CRISIS_STATE.get(id);

  await obj.fetch(new Request(c.req.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 
        'Content-Type': 'application/json', 
        'X-Internal-Broadcast': 'true' 
    }
  }));

  return c.json({ status: 'broadcasted' });
});


app.get('/', (c) => c.text('Sentinel AI Primary API (Edge)'));

export default app;

export { CrisisState };
