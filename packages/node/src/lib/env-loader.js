/**
 * Environment Variable Loader
 * Loads .env files using dotenvx before any other modules access process.env
 */

import { config } from '@dotenvx/dotenvx';

/**
 * Loads environment variables from .env file
 * Should be called at the very start of the application
 */
export function load_env() {
  // Load .env file from project root
  // dotenvx automatically looks for .env, .env.local, .env.production, etc.
  config({
    path: '.env',
    override: false, // Don't override existing env vars (system/env vars take precedence)
  });
}

