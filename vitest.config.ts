import { defineConfig } from 'vitest/config';

// Ambiente di default: node. I test DOM scelgono jsdom con un commento in testa al file.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
