const crypto = require('crypto');

console.log('# Copy these to your .env file:');
console.log('');
console.log('APP_KEYS=' + [
  crypto.randomBytes(16).toString('base64'),
  crypto.randomBytes(16).toString('base64'),
  crypto.randomBytes(16).toString('base64'),
  crypto.randomBytes(16).toString('base64')
].join(','));
console.log('API_TOKEN_SALT=' + crypto.randomBytes(16).toString('base64'));
console.log('ADMIN_JWT_SECRET=' + crypto.randomBytes(32).toString('base64'));
console.log('TRANSFER_TOKEN_SALT=' + crypto.randomBytes(16).toString('base64'));
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('base64'));