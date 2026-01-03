const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  console.log('Global Setup: Starting MongoDB Memory Server...');
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();
  console.log('Global Setup: Mongo URI:', uri);
  
  // Store the instance to stop it later? 
  // Global setup cannot easily pass object to teardown unless we write to global (which is risky or not shared).
  // But we can store it in a module variable if jest recycles? No.
  // Standard pattern: Write URI to a file or environment?
  // Actually, 'mongodb-memory-server' documentation suggests creating a separate Instance in globalSetup and stopping in globalTeardown.
  // We need to keep the reference. 
  // We can attach to `global` object of this process?
  global.__MONGOINSTANCE = instance;
  process.env.MONGO_URI = uri;
  
  // Also write to a temp file for test suites to pick up if env vars don't propagate?
  // Jest globalSetup runs in a separate process? No, usually main process.
  // Test suites run in workers. Workers receive process.env COPY.
  // So process.env modification here SHOULD propagate if Jest handles it correctly.
};
