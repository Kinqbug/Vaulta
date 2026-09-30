import { getDb } from './mongodb';
import { ApiError } from './http';

interface Attempt {
  key: string;
  createdAt: Date;
}

/** Mongo-backed so it works across serverless instances. Rows expire after an hour (TTL index). */
export async function assertBelowLimit(key: string, max: number, windowMs: number, message: string) {
  const db = await getDb();
  const n = await db
    .collection<Attempt>('auth_attempts')
    .countDocuments({ key, createdAt: { $gt: new Date(Date.now() - windowMs) } });
  if (n >= max) throw new ApiError(429, message);
}

export async function recordAttempt(key: string) {
  const db = await getDb();
  await db.collection<Attempt>('auth_attempts').insertOne({ key, createdAt: new Date() });
}
