/**
 * Post-install script to set up local environment file.
 * Copies .env.local.example to .env.local if it doesn't exist.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const example = path.join(root, '.env.local.example');
const dest = path.join(root, '.env.local');

try {
  if (!fs.existsSync(dest) && fs.existsSync(example)) {
    fs.copyFileSync(example, dest);
    console.log('Created .env.local from .env.local.example');
  }
} catch (error) {
  // Silently fail - this is a convenience script
}
