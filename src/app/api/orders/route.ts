import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { requireUser, type UserDoc } from '@/lib/auth';
import { findInvestment } from '@/lib/catalog';
import { ApiError, body, json, route } from '@/lib/http';
import { amountSchema, toCents, toDollars } from '@/lib/money';
import { getDb } from '@/lib/mongodb';
import type { OrderDoc } from '@/lib/portfolio';

const schema = z.object({
  investmentId: z.string().min(1).max(100),
  amount: amountSchema(1_000_000),
});

export const GET = route(async () => {
  const u = await requireUser();
  const db = await getDb();
  const rows = await db.collection<OrderDoc>('orders').find({ userId: u._id }).sort({ createdAt: -1 }).limit(100).toArray();
  return json({
    orders: rows.map((o) => ({
      id: o.ref,
      name: o.name,
      amount: toDollars(o.amountCents),
      fee: toDollars(o.feeCents),
      date: o.createdAt.toISOString().slice(0, 10),
      status: o.status,
    })),
  });
});

export const POST = route(async (req) => {
  const u = await requireUser();
  const { investmentId, amount } = await body(req, schema);
  const inv = findInvestment(investmentId);
  if (!inv) throw new ApiError(404, 'Investment not found.');

  const amountCents = toCents(amount);
  if (amountCents < toCents(inv.min)) {
    throw new ApiError(400, `Minimum investment is $${inv.min.toLocaleString('en-US')}.`, { amount: 'Below minimum.' });
  }
  const feeCents = Math.round(amountCents * inv.fee);
  const totalCents = amountCents + feeCents;

  const db = await getDb();
  // Debit only if funds suffice, in one atomic operation, so concurrent orders can't overdraw.
  const debited = await db
    .collection<UserDoc>('users')
    .findOneAndUpdate({ _id: u._id, balanceCents: { $gte: totalCents } }, { $inc: { balanceCents: -totalCents } }, { returnDocument: 'after' });
  if (!debited) throw new ApiError(402, "Your available balance isn't enough for this investment.");

  const order: Omit<OrderDoc, '_id'> = {
    userId: u._id,
    ref: `TX-${randomInt(100000, 1000000)}`,
    investmentId: inv.id,
    name: inv.name,
    type: inv.type,
    amountCents,
    feeCents,
    status: 'Processing',
    createdAt: new Date(),
  };
  try {
    await db.collection<Omit<OrderDoc, '_id'>>('orders').insertOne(order);
  } catch (e) {
    await db.collection<UserDoc>('users').updateOne({ _id: u._id }, { $inc: { balanceCents: totalCents } });
    throw e;
  }
  return json(
    {
      order: {
        id: order.ref,
        name: order.name,
        amount: toDollars(amountCents),
        fee: toDollars(feeCents),
        date: order.createdAt.toISOString().slice(0, 10),
        status: order.status,
      },
      balance: toDollars(debited.balanceCents),
    },
    { status: 201 },
  );
});
