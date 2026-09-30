import type { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import { toDollars } from './money';

export interface PlanDoc {
  _id: ObjectId;
  userId: ObjectId;
  balanceCents: number;
  employeeMonthlyCents: number;
  employerMonthlyCents: number;
  currentAge: number;
  retirementAge: number;
  goalCents: number;
  goalYear: number;
  updatedAt: Date;
}

export interface ContributionDoc {
  _id: ObjectId;
  userId: ObjectId;
  ref: string;
  amountCents: number;
  createdAt: Date;
}

/**
 * IRS elective deferral limit for 401(k) plans (employee contributions, under age 50), in cents.
 * This is a yearly figure: check it against irs.gov each January and update it here.
 */
export const ANNUAL_401K_LIMIT_CENTS = 24_500_00;

/** Assumed annual return for projections. Illustrative, not a forecast. */
export const ASSUMED_RETURN_PCT = 6;
/** Sustainable-withdrawal rule of thumb used for the income estimate. */
export const WITHDRAWAL_RATE = 0.04;

const fv = (pv: number, pmt: number, ratePct: number, years: number) => {
  const r = ratePct / 100 / 12;
  const n = Math.round(years * 12);
  if (!n) return pv;
  const g = r ? Math.pow(1 + r, n) : 1;
  return pv * g + (r ? (pmt * (g - 1)) / r : pmt * n);
};

export async function getOrCreatePlan(userId: ObjectId): Promise<PlanDoc> {
  const db = await getDb();
  const year = new Date().getFullYear();
  const defaults: Omit<PlanDoc, '_id' | 'userId'> = {
    balanceCents: 0,
    employeeMonthlyCents: 0,
    employerMonthlyCents: 0,
    currentAge: 35,
    retirementAge: 65,
    goalCents: 500_000_00,
    goalYear: year + 30,
    updatedAt: new Date(),
  };
  const plan = await db
    .collection<Omit<PlanDoc, '_id'>>('retirement_plans')
    .findOneAndUpdate({ userId }, { $setOnInsert: { userId, ...defaults } }, { upsert: true, returnDocument: 'after' });
  return plan as PlanDoc;
}

export async function planView(userId: ObjectId) {
  const db = await getDb();
  const plan = await getOrCreatePlan(userId);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const [recent, ytd] = await Promise.all([
    db.collection<ContributionDoc>('retirement_contributions').find({ userId }).sort({ createdAt: -1 }).limit(10).toArray(),
    db
      .collection<ContributionDoc>('retirement_contributions')
      .aggregate<{ t: number }>([
        { $match: { userId, createdAt: { $gte: yearStart } } },
        { $group: { _id: null, t: { $sum: '$amountCents' } } },
      ])
      .toArray(),
  ]);
  const contributedYtdCents = ytd[0]?.t ?? 0;

  const pv = toDollars(plan.balanceCents);
  const pmt = toDollars(plan.employeeMonthlyCents + plan.employerMonthlyCents);
  const yearsToRetirement = Math.max(0, plan.retirementAge - plan.currentAge);
  const projectedAtRetirement = fv(pv, pmt, ASSUMED_RETURN_PCT, yearsToRetirement);

  return {
    plan: {
      balance: pv,
      employeeMonthly: toDollars(plan.employeeMonthlyCents),
      employerMonthly: toDollars(plan.employerMonthlyCents),
      currentAge: plan.currentAge,
      retirementAge: plan.retirementAge,
      goal: toDollars(plan.goalCents),
      goalYear: plan.goalYear,
    },
    projection: {
      assumedReturnPct: ASSUMED_RETURN_PCT,
      yearsToRetirement,
      balanceAtRetirement: Math.round(projectedAtRetirement),
      monthlyIncome: Math.round((projectedAtRetirement * WITHDRAWAL_RATE) / 12),
      goalProgressPct: plan.goalCents ? Math.min(100, Math.round((plan.balanceCents / plan.goalCents) * 100)) : 0,
      series: [0, 5, 10, 20, 30].map((y) => Math.round(fv(pv, pmt, ASSUMED_RETURN_PCT, y))),
    },
    limits: {
      annual: toDollars(ANNUAL_401K_LIMIT_CENTS),
      contributedThisYear: toDollars(contributedYtdCents),
      remainingThisYear: toDollars(Math.max(0, ANNUAL_401K_LIMIT_CENTS - contributedYtdCents)),
    },
    contributions: recent.map((c) => ({
      id: c.ref,
      amount: toDollars(c.amountCents),
      date: c.createdAt.toISOString().slice(0, 10),
    })),
  };
}
