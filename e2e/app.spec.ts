import { test, expect } from '@playwright/test';

test('loads landing page', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/FamilyConnect/);
});

test('onboarding flow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  const initButton = page.locator('button', { hasText: /Initialize Node/ });
  await expect(initButton).toBeVisible();
});

test('vault unlock', async ({ page }) => {
  await page.goto('http://localhost:3000');
  const unlockInput = page.locator('input[placeholder*="MASTER KEY"]');
  await expect(unlockInput).toBeVisible();
});
