import { test, expect } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  return `app${ts}@example.com`;
}

test('Navbar e usuário visíveis após login', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('token', 'fake-token');
    sessionStorage.setItem('user', JSON.stringify({ id: 1, name: 'Usuário Nav', email: 'nav@example.com', phone: '5511976871674' }));
  });
  await page.goto('/app');
  await expect(page.locator('.menu a.active')).toHaveText('Dashboard');
  await expect(page.locator('#user-name')).toContainText('Usuário Nav');
});