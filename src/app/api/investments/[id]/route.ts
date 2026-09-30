import { findInvestment } from '@/lib/catalog';
import { ApiError, json, route } from '@/lib/http';

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const inv = findInvestment((await ctx.params).id);
  if (!inv) throw new ApiError(404, 'Investment not found.');
  return json({ investment: inv }, { headers: { 'Cache-Control': 'public, max-age=300' } });
});
