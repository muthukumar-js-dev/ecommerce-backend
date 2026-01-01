// Simple test runner to execute our unit tests without Jest infrastructure
// This allows us to verify logic now before Task 3

(global as any).describe = (name: string, fn: () => void) => {
  console.log(`\n${name}`);
  fn();
};

(global as any).it = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error: any) {
    console.error(`  ✕ ${name}`);
    console.error(`    ${error.message}`);
    process.exit(1);
  }
};

(global as any).expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} but got ${actual}`);
    }
  },
  toHaveLength: (expected: number) => {
    if (actual.length !== expected) {
      throw new Error(`Expected length ${expected} but got ${actual.length}`);
    }
  },
  toContain: (item: any) => {
    if (!actual.includes(item)) {
      throw new Error(`Expected ${actual} to contain ${item}`);
    }
  },
});

// Import tests to run
import './shared/__tests__/result.test';
import './shared/__tests__/errors.test';
