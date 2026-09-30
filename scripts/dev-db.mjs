// Starts a throwaway local MongoDB so you can run the app without an Atlas account.
// Usage: npm run dev:db   (first run downloads a mongod binary), then copy the printed URI into .env.local
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongod = await MongoMemoryServer.create({ instance: { port: 27017 } });
console.log('\nLocal MongoDB running. Put this in .env.local:\n');
console.log(`MONGODB_URI=${mongod.getUri()}`);
console.log('\nData is discarded when this process exits. Ctrl+C to stop.\n');
process.on('SIGINT', async () => {
  await mongod.stop();
  process.exit(0);
});
setInterval(() => {}, 1 << 30);
