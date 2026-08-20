const { test, expect } = require('@playwright/test');

test.describe('Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app which should show setup if no endpoint is configured
    await page.goto('/');
  });

  test('should display the setup screen initially', async ({ page }) => {
    // Check if the setup screen is visible
    await expect(page.locator('.setup')).toBeVisible();
    await expect(page.locator('.setup h3')).toHaveText('Connect your Sheet');
    await expect(page.locator('#epin')).toBeVisible();
    await expect(page.locator('#epsave')).toBeVisible();
  });

  test('should show error when trying to save empty URL', async ({ page }) => {
    // Click the save button with empty input
    await page.locator('#epsave').click();

    // Status should update to show error
    const status = page.locator('#status');
    await expect(status).toHaveClass(/err/);
    await expect(status).toHaveText('Paste the /exec URL first');
  });

  test('should successfully save endpoint and attempt to fetch data', async ({ page }) => {
    // Mock the endpoint response
    const mockEndpoint = 'https://script.google.com/macros/s/fake_id/exec';

    // We intercept the network request to mock the backend response
    await page.route(mockEndpoint, async route => {
      const json = {
        ok: true,
        log: {}
      };
      await route.fulfill({ json });
    });

    // Input the mock endpoint
    await page.locator('#epin').fill(mockEndpoint);

    // Click save
    await page.locator('#epsave').click();

    // Verify connecting message is briefly shown
    const status = page.locator('#status');
    await expect(status).toHaveText('Synced with Sheet');
    await expect(status).toHaveClass(/ok/);

    // Verify local storage was updated
    const endpointInStorage = await page.evaluate(() => localStorage.getItem('ledger_endpoint'));
    expect(endpointInStorage).toBe(mockEndpoint);

    // Verify setup screen is no longer shown, app is rendered
    await expect(page.locator('.setup')).not.toBeVisible();
    await expect(page.locator('.topbar')).toBeVisible();
  });

  test('should handle network error when syncing with Sheet', async ({ page }) => {
    // Mock the endpoint response to simulate a network error
    const mockEndpoint = 'https://script.google.com/macros/s/fake_id/exec';

    await page.route(mockEndpoint, async route => {
      await route.abort('failed');
    });

    await page.locator('#epin').fill(mockEndpoint);
    await page.locator('#epsave').click();

    // Verify error message is shown
    const status = page.locator('#status');
    await expect(status).toHaveClass(/warn/);
    await expect(status).toContainText('Sheet unreachable, using this device:');

    // Verify setup screen is no longer shown, app is rendered using cache
    await expect(page.locator('.setup')).not.toBeVisible();
    await expect(page.locator('.topbar')).toBeVisible();
  });

  test('should handle API returning ok: false', async ({ page }) => {
    // Mock the endpoint response to simulate a backend error
    const mockEndpoint = 'https://script.google.com/macros/s/fake_id/exec';

    await page.route(mockEndpoint, async route => {
      const json = {
        ok: false,
        error: 'Invalid sheet ID'
      };
      await route.fulfill({ json });
    });

    await page.locator('#epin').fill(mockEndpoint);
    await page.locator('#epsave').click();

    // Verify error message is shown
    const status = page.locator('#status');
    await expect(status).toHaveClass(/warn/);
    await expect(status).toContainText('Invalid sheet ID');

    // Verify setup screen is no longer shown, app is rendered using cache
    await expect(page.locator('.setup')).not.toBeVisible();
    await expect(page.locator('.topbar')).toBeVisible();
  });
});
