const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const example = path.join(root, '.env.local.example');
const dest = path.join(root, '.env.local');

try {
  if (!fs.existsSync(dest) && fs.existsSync(example)) {
    fs.copyFileSync(example, dest);
    console.log('.env.local created from .env.local.example');
  }
} catch (e) {
  // best effort
}
