import { defineConfig } from 'vitest/config';

// Ambiente dei test: node (nessun test usa il DOM).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
