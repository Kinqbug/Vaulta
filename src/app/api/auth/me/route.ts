import { currentUser, endSession, publicUser } from '@/lib/auth';
import { json, route } from '@/lib/http';

export const GET = route(async () => {
  const u = await currentUser();
  // A cookie that verifies but has no user (account deleted, database reset) is stale: drop it.
  if (!u) await endSession();
  return json({ user: u ? publicUser(u) : null });
});
