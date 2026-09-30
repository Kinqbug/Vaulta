import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { ApiError, body, json, route } from '@/lib/http';
import { toCents } from '@/lib/money';
import { getDb } from '@/lib/mongodb';
import { getOrCreatePlan, planView, type PlanDoc } from '@/lib/retirement';

const money = (max: number) => z.number().min(0).max(max).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Use at most two decimal places.');
const year = new Date().getFullYear();

const schema = z
  .object({
    currentAge: z.number().int().min(18).max(100),
    retirementAge: z.number().int().min(40).max(90),
    employeeMonthly: money(50_000),
    employerMonthly: money(50_000),
    goal: z.number().min(1_000).max(100_000_000),
    goalYear: z.number().int().min(year).max(year + 80),
  })
  .partial();

export const GET = route(async () => {
  const u = await requireUser();
  return json(await planView(u._id));
});

export const PUT = route(async (req) => {
  const u = await requireUser();
  const input = await body(req, schema);
  const cur = await getOrCreatePlan(u._id);

  const currentAge = input.currentAge ?? cur.currentAge;
  const retirementAge = input.retirementAge ?? cur.retirementAge;
  if (retirementAge <= currentAge) {
    throw new ApiError(400, 'Retirement age must be after your current age.', { retirementAge: 'Must be after current age.' });
  }

  const set: Partial<PlanDoc> = { currentAge, retirementAge, updatedAt: new Date() };
  if (input.employeeMonthly !== undefined) set.employeeMonthlyCents = toCents(input.employeeMonthly);
  if (input.employerMonthly !== undefined) set.employerMonthlyCents = toCents(input.employerMonthly);
  if (input.goal !== undefined) set.goalCents = toCents(input.goal);
  if (input.goalYear !== undefined) set.goalYear = input.goalYear;

  const db = await getDb();
  await db.collection<PlanDoc>('retirement_plans').updateOne({ userId: u._id }, { $set: set });
  return json(await planView(u._id));
});
