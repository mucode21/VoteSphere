import { test, expect } from '@playwright/test';

test.describe('VoteSphere E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Open the App
    await page.goto('/');
  });

  test('Scenario 1: Wallet Connect and Navigation Flow', async ({ page }) => {
    // Verify landing page title
    await expect(page.locator('text=Trust Every Vote.')).toBeVisible();

    // Click Connect Wallet
    const connectBtn = page.getByRole('button', { name: 'Connect Wallet' }).first();
    await connectBtn.click();

    // Verify modal options are shown
    await expect(page.locator('text=Connect Wallet')).toBeVisible();
    await expect(page.locator('text=Freighter')).toBeVisible();

    // Click Freighter Wallet
    await page.locator('text=Freighter').click();

    // Modal should close
    await expect(page.locator('text=Connect Wallet')).not.toBeVisible();
  });

  test('Scenario 2: Navigate to Create Election and Verify Form Fields', async ({ page }) => {
    // Click Create Election
    await page.getByRole('button', { name: 'Create Election' }).click();

    // Verify step 1 title
    await expect(page.locator('text=Basic Information')).toBeVisible();

    // Fill Title
    await page.getByPlaceholder('e.g. Protocol Upgrade Proposal Q4').fill('E2E Test Proposal');

    // Fill Description
    await page.getByPlaceholder('Provide details about the election, voting criteria, and implications...').fill('This is a test description.');

    // Click Next
    await page.getByRole('button', { name: 'Next' }).click();

    // Verify step 2
    await expect(page.locator('text=Candidates & Nominees')).toBeVisible();
  });

  test('Scenario 3: Tally Results Page Dashboard Metrics', async ({ page }) => {
    // Navigate to Governance (Dashboard)
    await page.getByRole('button', { name: 'Governance' }).first().click();

    // Verify analytics components
    await expect(page.locator('text=Governance Analytics')).toBeVisible();
    await expect(page.locator('text=Recent On-Chain Activity')).toBeVisible();
  });

  test('Scenario 4: XLM Transaction Flow Form Page', async ({ page }) => {
    // Navigate to XLM Transfer
    await page.getByRole('button', { name: 'XLM Transfer' }).first().click();

    // Verify inputs
    await expect(page.locator('text=XLM Transaction Flow')).toBeVisible();
    await expect(page.locator('text=Recipient Address')).toBeVisible();
    await expect(page.locator('text=Amount (XLM)')).toBeVisible();
  });
});
