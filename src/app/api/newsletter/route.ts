import { z } from 'zod';
import { body, clientIp, json, route } from '@/lib/http';
import { getDb } from '@/lib/mongodb';
import { assertBelowLimit, recordAttempt } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Please enter a valid email address.')),
});

export const POST = route(async (req) => {
  const { email } = await body(req, schema);
  const key = `newsletter:${clientIp(req)}`;
  await assertBelowLimit(key, 10, 60 * 60 * 1000, 'Too many requests. Please try again later.');
  const db = await getDb();
  // Idempotent: subscribing twice is not an error and doesn't reveal whether the email was known.
  await db.collection('newsletter').updateOne({ email }, { $setOnInsert: { email, createdAt: new Date() } }, { upsert: true });
  await recordAttempt(key);
  return json({ ok: true }, { status: 201 });
});
