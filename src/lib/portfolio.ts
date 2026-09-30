import type { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import { findInvestment } from './catalog';
import { toDollars } from './money';

export interface OrderDoc {
  _id: ObjectId;
  userId: ObjectId;
  ref: string;
  investmentId: string;
  name: string;
  type: string;
  amountCents: number;
  feeCents: number;
  status: 'Processing' | 'Completed';
  createdAt: Date;
}

const DAY = 86400000;
/** Demo orders settle after an hour; a real broker integration would drive this instead. */
const SETTLE_AFTER_MS = 60 * 60 * 1000;

/** Demo valuation: an order grows at its investment's demo annual return, pro rata by days held. */
const valueCents = (o: OrderDoc, now: number) => {
  const ret = findInvestment(o.investmentId)?.ret ?? 0;
  const years = Math.max(0, now - o.createdAt.getTime()) / DAY / 365;
  return Math.round(o.amountCents * (1 + (ret / 100) * years));
};

export async function portfolioFor(userId: ObjectId, balanceCents: number) {
  const db = await getDb();
  const orders = db.collection<OrderDoc>('orders');
  const now = Date.now();
  await orders.updateMany(
    { userId, status: 'Processing', createdAt: { $lt: new Date(now - SETTLE_AFTER_MS) } },
    { $set: { status: 'Completed' } },
  );
  const all = await orders.find({ userId }).sort({ createdAt: -1 }).limit(2000).toArray();

  let invested = 0;
  let value = 0;
  const byType = new Map<string, number>();
  for (const o of all) {
    const v = valueCents(o, now);
    invested += o.amountCents;
    value += v;
    byType.set(o.type, (byType.get(o.type) ?? 0) + v);
  }
  const ret = value - invested;
  return {
    balance: toDollars(balanceCents),
    totals: {
      invested: toDollars(invested),
      value: toDollars(value),
      ret: toDollars(ret),
      pct: invested ? (ret / invested) * 100 : 0,
    },
    alloc: [...byType].map(([k, v]) => ({ k, v: toDollars(v), p: (v / value) * 100 })),
    txns: all.slice(0, 50).map((o) => ({
      id: o.ref,
      name: o.name,
      amount: toDollars(o.amountCents),
      fee: toDollars(o.feeCents),
      date: o.createdAt.toISOString().slice(0, 10),
      status: o.status,
    })),
  };
}
