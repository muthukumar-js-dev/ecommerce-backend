import { MongoMemoryServer } from 'mongodb-memory-server';

async function run() {
  console.log('Starting MongoMemoryServer debug script...');
  try {
    const mongod = await MongoMemoryServer.create();
    console.log('MongoDB Memory Server Started Successfully!');
    console.log('URI:', mongod.getUri());
    await mongod.stop();
    console.log('Stopped successfully.');
  } catch (err) {
    console.error('Failed to start MongoMemoryServer:', err);
  }
}
run();
