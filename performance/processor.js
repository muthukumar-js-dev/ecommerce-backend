module.exports = {
  generateRandomEmail,
  generateRandomString,
  generateRandomNumber,
};

function generateRandomEmail(context, events, done) {
  context.vars.randomEmail = `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`;
  return done();
}

function generateRandomString(context, events, done) {
  context.vars.randomString = Math.random().toString(36).substring(2, 12);
  return done();
}

function generateRandomNumber(context, events, done) {
  context.vars.randomNumber = Math.floor(Math.random() * 1000) + 1;
  return done();
}
