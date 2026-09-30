import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import { ApiError } from './http';

export interface UserDoc {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  balanceCents: number;
  createdAt: Date;
}

const COOKIE = 'vaulta_session';
const DAY = 86400;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be set to a string of at least 32 characters');
  return new TextEncoder().encode(s);
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
/** Used to spend the same time on unknown emails as on wrong passwords. */
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export async function startSession(userId: ObjectId, remember: boolean) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId.toHexString())
    .setIssuedAt()
    .setExpirationTime(remember ? '30d' : '7d')
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: 30 * DAY } : {}),
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user, or null. */
export async function currentUser(): Promise<UserDoc | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (!payload.sub || !ObjectId.isValid(payload.sub)) return null;
    const db = await getDb();
    return await db.collection<UserDoc>('users').findOne({ _id: new ObjectId(payload.sub) });
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<UserDoc> {
  const u = await currentUser();
  if (!u) throw new ApiError(401, 'Sign in to continue.');
  return u;
}

export const publicUser = (u: UserDoc) => ({ id: u._id.toHexString(), name: u.name, email: u.email });
