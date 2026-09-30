import { z } from 'zod';
import { body, clientIp, json, route } from '@/lib/http';
import { getDb } from '@/lib/mongodb';
import { assertBelowLimit, recordAttempt } from '@/lib/rate-limit';

const TOPICS = ['General Inquiry', 'Investing', 'Savings', 'Trading', 'Retirement', 'Technical Support', 'Partnerships', 'Press'];

const schema = z.object({
  firstName: z.string().trim().min(1, 'This field is required.').max(80),
  lastName: z.string().trim().min(1, 'This field is required.').max(80),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address.')),
  phone: z.string().trim().max(40).optional(),
  topic: z.enum(TOPICS as [string, ...string[]]),
  message: z.string().trim().min(10, 'Enter at least 10 characters.').max(5000),
});

export const POST = route(async (req) => {
  const input = await body(req, schema);
  const key = `contact:${clientIp(req)}`;
  await assertBelowLimit(key, 5, 60 * 60 * 1000, 'Too many messages. Please try again later.');
  const db = await getDb();
  await db.collection('contact_messages').insertOne({ ...input, createdAt: new Date() });
  await recordAttempt(key);
  return json({ ok: true }, { status: 201 });
});
