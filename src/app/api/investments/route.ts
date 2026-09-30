import { CATALOG } from '@/lib/catalog';
import { json, route } from '@/lib/http';

export const GET = route(async () =>
  json({ investments: CATALOG }, { headers: { 'Cache-Control': 'public, max-age=300' } }),
);
