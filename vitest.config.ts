import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    reporters: ['./dist/test/reporter/jsonlReporter.js'],
  },
});
