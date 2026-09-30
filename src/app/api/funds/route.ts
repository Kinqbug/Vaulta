import { z } from 'zod';
import { requireUser, type UserDoc } from '@/lib/auth';
import { ApiError, body, json, route } from '@/lib/http';
import { amountSchema, toCents, toDollars } from '@/lib/money';
import { getDb } from '@/lib/mongodb';

const MAX_BALANCE_CENTS = toCents(1_000_000);
const schema = z.object({ amount: amountSchema(10_000) });

/** Demo top-up. There is no payment rail here; disable with ALLOW_DEMO_FUNDING=false. */
export const POST = route(async (req) => {
  if (process.env.ALLOW_DEMO_FUNDING === 'false') throw new ApiError(403, 'Adding funds is not available.');
  const u = await requireUser();
  const { amount } = await body(req, schema);
  const cents = toCents(amount);
  const db = await getDb();
  const after = await db
    .collection<UserDoc>('users')
    .findOneAndUpdate({ _id: u._id, balanceCents: { $lte: MAX_BALANCE_CENTS - cents } }, { $inc: { balanceCents: cents } }, { returnDocument: 'after' });
  if (!after) throw new ApiError(400, 'That would exceed the maximum demo balance.');
  return json({ balance: toDollars(after.balanceCents) });
});
