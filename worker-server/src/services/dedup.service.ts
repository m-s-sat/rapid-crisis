import type { RedisClientType } from "redis";

const COOLDOWN_SECONDS = 600;

interface CrisisSession {
    crisis_session_id: string;
    first_detected_at: string;
    last_updated_at: string;
    reading_count: number;
    peak_confidence: number;
    sms_sent: boolean;
    admin_notified: boolean;
    mongo_response_id: string;
}

function buildKey(venueId: string, zone: string, crisisType: string): string {
    return `active_crisis:${venueId}:${zone}:${crisisType}`;
}

function generateSessionId(): string {
    return `cs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export async function getActiveSession(
    redis: RedisClientType,
    venueId: string,
    zone: string,
    crisisType: string
): Promise<CrisisSession | null> {
    const key = buildKey(venueId, zone, crisisType);
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as CrisisSession;
}

export async function createSession(
    redis: RedisClientType,
    venueId: string,
    zone: string,
    crisisType: string,
    confidence: number,
    mongoResponseId: string
): Promise<CrisisSession> {
    const key = buildKey(venueId, zone, crisisType);
    const session: CrisisSession = {
        crisis_session_id: generateSessionId(),
        first_detected_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        reading_count: 1,
        peak_confidence: confidence,
        sms_sent: false,
        admin_notified: false,
        mongo_response_id: mongoResponseId,
    };
    await redis.set(key, JSON.stringify(session), { EX: COOLDOWN_SECONDS });
    return session;
}

export async function updateSession(
    redis: RedisClientType,
    venueId: string,
    zone: string,
    crisisType: string,
    confidence: number
): Promise<CrisisSession | null> {
    const key = buildKey(venueId, zone, crisisType);
    const session = await getActiveSession(redis, venueId, zone, crisisType);
    if (!session) return null;

    session.last_updated_at = new Date().toISOString();
    session.reading_count += 1;
    if (confidence > session.peak_confidence) {
        session.peak_confidence = confidence;
    }

    await redis.set(key, JSON.stringify(session), { EX: COOLDOWN_SECONDS });
    return session;
}

export async function markSmsSent(
    redis: RedisClientType,
    venueId: string,
    zone: string,
    crisisType: string
): Promise<void> {
    const session = await getActiveSession(redis, venueId, zone, crisisType);
    if (!session) return;
    session.sms_sent = true;
    const key = buildKey(venueId, zone, crisisType);
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(session), { EX: ttl > 0 ? ttl : COOLDOWN_SECONDS });
}

export async function markAdminNotified(
    redis: RedisClientType,
    venueId: string,
    zone: string,
    crisisType: string
): Promise<void> {
    const session = await getActiveSession(redis, venueId, zone, crisisType);
    if (!session) return;
    session.admin_notified = true;
    const key = buildKey(venueId, zone, crisisType);
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(session), { EX: ttl > 0 ? ttl : COOLDOWN_SECONDS });
}
