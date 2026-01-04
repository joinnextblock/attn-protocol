import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.spec.js'],
    exclude: ['node_modules', 'dist'],
  },
});
