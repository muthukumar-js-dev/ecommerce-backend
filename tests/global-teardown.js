const mongoose = require('mongoose');

module.exports = async function globalTeardown() {
  console.log('Global Teardown: Stopping MongoDB Memory Server...');
  if (global.__MONGOINSTANCE) {
    await global.__MONGOINSTANCE.stop();
  }
};
