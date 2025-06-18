import * as path from 'path';
import * as fs from 'fs';

// Set up test environment
const testNotesPath = path.join(__dirname, '../test-notes');

// Ensure test notes directory exists for tests
beforeAll(() => {
  if (!fs.existsSync(testNotesPath)) {
    throw new Error('Test notes directory not found. Run setup to create test notes.');
  }
});

// Set test timeout
jest.setTimeout(30000);