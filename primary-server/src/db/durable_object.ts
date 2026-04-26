/// <reference types="@cloudflare/workers-types" />
import { DurableObject } from "cloudflare:workers";

export class CrisisState extends DurableObject {
  private sessions = new Set<any>();

  constructor(state: any, env: any) {
    super(state, env);
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    
    if (request.headers.get("X-Internal-Broadcast") === "true") {
      const body = await request.json();
      this.broadcast(JSON.stringify(body));
      return new Response("Broadcasted", { status: 200 });
    }

    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const [client, server] = new WebSocketPair();
    await this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(ws: any) {
    ws.accept();
    this.sessions.add(ws);

    ws.addEventListener("message", async (msg: any) => {
    });

    ws.addEventListener("close", () => {
      this.sessions.delete(ws);
    });

    ws.addEventListener("error", () => {
      this.sessions.delete(ws);
    });
  }

  async broadcast(message: string) {
    this.sessions.forEach((ws) => {
      try {
        ws.send(message);
      } catch (e) {
        this.sessions.delete(ws);
      }
    });
  }
}
