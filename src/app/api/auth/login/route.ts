import { z } from 'zod';
import { getDb } from '@/lib/mongodb';
import { DUMMY_HASH, publicUser, startSession, verifyPassword, type UserDoc } from '@/lib/auth';
import { ApiError, body, clientIp, json, route } from '@/lib/http';
import { assertBelowLimit, recordAttempt } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1, 'Enter your password.').max(200),
  remember: z.boolean().optional(),
});

export const POST = route(async (req) => {
  const { email, password, remember } = await body(req, schema);
  const key = `login:${email}:${clientIp(req)}`;
  await assertBelowLimit(key, 8, 15 * 60 * 1000, 'Too many failed attempts. Try again in 15 minutes.');

  const db = await getDb();
  const user = await db.collection<UserDoc>('users').findOne({ email });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    await recordAttempt(key);
    throw new ApiError(401, 'Incorrect email or password.');
  }
  await startSession(user._id, !!remember);
  return json({ user: publicUser(user) });
});
