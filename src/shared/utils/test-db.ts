import mongoose from 'mongoose';

export async function connectToTestDB(uri: string): Promise<void> {
  if ((mongoose.connection.readyState as number) !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
  console.log('App Mongoose Connected via Helper to:', uri);
}

export async function disconnectTestDB(): Promise<void> {
  await mongoose.disconnect();
}

export async function clearTestDB(): Promise<void> {
  if (mongoose.connection && mongoose.connection.collections) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      if (collection) {
        await collection.deleteMany({});
      }
    }
  }
}
