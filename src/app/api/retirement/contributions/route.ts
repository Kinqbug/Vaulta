import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { requireUser, type UserDoc } from '@/lib/auth';
import { ApiError, body, json, route } from '@/lib/http';
import { amountSchema, toCents } from '@/lib/money';
import { getDb } from '@/lib/mongodb';
import { ANNUAL_401K_LIMIT_CENTS, getOrCreatePlan, planView, type ContributionDoc, type PlanDoc } from '@/lib/retirement';

const schema = z.object({ amount: amountSchema(ANNUAL_401K_LIMIT_CENTS / 100) });

/** Moves money from the user's cash balance into their 401(k). */
export const POST = route(async (req) => {
  const u = await requireUser();
  const { amount } = await body(req, schema);
  const cents = toCents(amount);
  await getOrCreatePlan(u._id);
  const db = await getDb();

  const before = await planView(u._id);
  if (cents > toCents(before.limits.remainingThisYear)) {
    throw new ApiError(
      400,
      `That's over this year's $${before.limits.annual.toLocaleString('en-US')} limit. You can still add $${before.limits.remainingThisYear.toLocaleString('en-US')}.`,
      { amount: 'Over the annual limit.' },
    );
  }

  const debited = await db
    .collection<UserDoc>('users')
    .findOneAndUpdate({ _id: u._id, balanceCents: { $gte: cents } }, { $inc: { balanceCents: -cents } }, { returnDocument: 'after' });
  if (!debited) throw new ApiError(402, "Your available balance isn't enough for this contribution.");

  try {
    await db.collection<Omit<ContributionDoc, '_id'>>('retirement_contributions').insertOne({
      userId: u._id,
      ref: `RC-${randomInt(100000, 1000000)}`,
      amountCents: cents,
      createdAt: new Date(),
    });
    await db.collection<PlanDoc>('retirement_plans').updateOne({ userId: u._id }, { $inc: { balanceCents: cents }, $set: { updatedAt: new Date() } });
  } catch (e) {
    await db.collection<UserDoc>('users').updateOne({ _id: u._id }, { $inc: { balanceCents: cents } });
    throw e;
  }
  return json({ ...(await planView(u._id)), cashBalance: debited.balanceCents / 100 }, { status: 201 });
});
