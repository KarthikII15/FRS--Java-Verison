import { loginToIvis } from '../services/ivisAuth.js';

console.log('Testing IVIS login...');
loginToIvis()
  .then((token) => {
    console.log('✅ IVIS login successful');
    console.log('Token preview:', token.slice(0, 40) + '...');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ IVIS login failed:', err.message);
    process.exit(1);
  });
