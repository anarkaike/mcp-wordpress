import { test, expect } from '@playwright/test'

function uniqEmail(){ const ts=Date.now(); return `login${ts}@example.com`; }

test('Login redireciona para área logada', async ({ page, request }) => {
  const email = uniqEmail();
  const password = 'SenhaSegura123';
  const reg = await request.post('/api/auth/register', { data: { name: 'Login Test', email, phone: '+55 11 99999-9999', password } });
  expect(reg.ok()).toBeTruthy();
  await page.goto('/');
  await page.fill('#login-id', email);
  await page.fill('#login-pass', password);
  await Promise.all([
    page.waitForURL('**/app'),
    page.click('#login-btn'),
  ]);
  await expect(page.locator('#user-name')).toBeVisible();
});