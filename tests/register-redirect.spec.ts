import { test, expect } from '@playwright/test'

function uniqueEmail(){ const ts=Date.now(); return `reg${ts}@example.com`; }

test('Cadastro redireciona direto para área logada', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Cadastro').click();
  const email = uniqueEmail();
  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999, name: 'Cadastro Auto Login', email, phone: '5511999999999' }) });
  });
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'tok-abc', user: { id: 999, name: 'Cadastro Auto Login', email } }) });
  });
  await page.fill('#reg-name', 'Cadastro Auto Login');
  await page.fill('#reg-email', email);
  await page.fill('#reg-phone', '(11) 99999-9999');
  await page.fill('#reg-pass', 'SenhaSegura123');
  await page.fill('#reg-pass2', 'SenhaSegura123');
  await Promise.all([
    page.waitForURL('**/app'),
    page.click('#reg-btn'),
  ]);
  await expect(page.locator('#user-name')).toContainText('Cadastro Auto Login');
});