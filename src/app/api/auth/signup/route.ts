import { z } from 'zod';
import { getDb } from '@/lib/mongodb';
import { hashPassword, startSession, publicUser, type UserDoc } from '@/lib/auth';
import { ApiError, body, clientIp, json, route } from '@/lib/http';
import { assertBelowLimit, recordAttempt } from '@/lib/rate-limit';
import { toCents } from '@/lib/money';

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address.')),
  password: z
    .string()
    .min(8, 'Enter at least 8 characters.')
    .refine((p) => Buffer.byteLength(p) <= 72, 'Password is too long (72 bytes max).'),
});

export const POST = route(async (req) => {
  const input = await body(req, schema);
  const ipKey = `signup:${clientIp(req)}`;
  await assertBelowLimit(ipKey, 10, 60 * 60 * 1000, 'Too many sign-ups from this network. Try again later.');

  const db = await getDb();
  const users = db.collection<Omit<UserDoc, '_id'>>('users');
  const doc = {
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
    balanceCents: toCents(Number(process.env.DEMO_STARTING_BALANCE ?? 12500)),
    createdAt: new Date(),
  };
  try {
    const { insertedId } = await users.insertOne(doc);
    await recordAttempt(ipKey);
    await startSession(insertedId, true);
    return json({ user: publicUser({ _id: insertedId, ...doc }) }, { status: 201 });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      throw new ApiError(409, 'An account with this email already exists.', { email: 'Email already registered.' });
    }
    throw e;
  }
});
