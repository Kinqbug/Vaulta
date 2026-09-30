import { publicUser, requireUser } from '@/lib/auth';
import { json, route } from '@/lib/http';
import { portfolioFor } from '@/lib/portfolio';

export const GET = route(async () => {
  const u = await requireUser();
  return json({ user: publicUser(u), ...(await portfolioFor(u._id, u.balanceCents)) });
});
