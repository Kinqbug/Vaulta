import { MongoClient, type Db } from 'mongodb';

const g = globalThis as unknown as {
  _vaultaClient?: Promise<MongoClient>;
  _vaultaIndexes?: Promise<void>;
};

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  // Cached on globalThis so dev hot reloads and warm serverless invocations reuse one pool.
  g._vaultaClient ??= new MongoClient(uri, { maxPoolSize: 10 }).connect();
  return g._vaultaClient;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('orders').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('retirement_plans').createIndex({ userId: 1 }, { unique: true }),
    db.collection('retirement_contributions').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('newsletter').createIndex({ email: 1 }, { unique: true }),
    db.collection('auth_attempts').createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 }),
    db.collection('auth_attempts').createIndex({ key: 1, createdAt: -1 }),
  ]);
}

export async function getDb(): Promise<Db> {
  const db = (await client()).db(process.env.MONGODB_DB || 'vaulta');
  g._vaultaIndexes ??= ensureIndexes(db).catch((e) => {
    g._vaultaIndexes = undefined; // retry on next request
    throw e;
  });
  await g._vaultaIndexes;
  return db;
}
