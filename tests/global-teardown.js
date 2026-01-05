const mongoose = require('mongoose');

module.exports = async function globalTeardown() {
  console.log('Global Teardown: Stopping MongoDB Memory Server...');
  if (global.__MONGOINSTANCE) {
    await global.__MONGOINSTANCE.stop();
  }
  
  const fs = require('fs');
  const path = require('path');
  const uriPath = path.join(__dirname, 'mongo-uri.json');
  if (fs.existsSync(uriPath)) {
      fs.unlinkSync(uriPath);
  }
};
