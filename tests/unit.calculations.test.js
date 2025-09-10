import { epley1RM, brzycki1RM, setVolume } from '../js/calculations.js';
import assert from 'assert';

try {
  assert.strictEqual(epley1RM(100, 10), 100 * (1 + 10/30));
  assert.strictEqual(brzycki1RM(100, 10), 100 * 36 / (37 - 10));
  assert.strictEqual(setVolume(10, 100), 1000);
  console.log('All calculation tests passed');
} catch (err) {
  console.error('Calculation tests failed');
  console.error(err);
  process.exit(1);
}
