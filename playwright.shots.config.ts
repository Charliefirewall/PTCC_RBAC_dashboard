import base from './playwright.config';
import { defineConfig } from '@playwright/test';

/** Screenshot capture lives outside ./e2e so `npm run e2e` stays a fast smoke run. */
export default defineConfig({ ...base, testDir: './tools' });
