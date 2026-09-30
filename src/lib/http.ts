import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodType } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export const json = (body: unknown, init?: ResponseInit) => NextResponse.json(body, init);

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/**
 * Wraps a route handler: same-origin check on state-changing requests, and uniform JSON errors.
 * The session cookie is SameSite=Lax; the Origin check is a second layer against CSRF.
 */
export function route<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const origin = req.headers.get('origin');
        if (origin && new URL(origin).host !== req.headers.get('host')) {
          throw new ApiError(403, 'Cross-origin request blocked.');
        }
      }
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) {
        return json({ error: e.message, fields: e.fields }, { status: e.status });
      }
      if (e instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const i of e.issues) fields[String(i.path[0] ?? '_')] ??= i.message;
        return json({ error: e.issues[0]?.message ?? 'Invalid request.', fields }, { status: 400 });
      }
      console.error('[api]', req.method, req.nextUrl.pathname, e);
      return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
  };
}

export async function body<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, 'Request body must be JSON.');
  }
  return schema.parse(raw);
}

export const clientIp = (req: NextRequest) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
