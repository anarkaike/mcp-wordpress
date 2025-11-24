import { test, expect } from '@playwright/test';

test.describe('Formatação de telefone com DDI', () => {
  test('Cadastro formata 5511976871674 como +55 11 97687-1674', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.click('.tab[data-tab="register"]');
    const phone = page.locator('#reg-phone');
    await phone.fill('5511976871674');
    await expect(phone).toHaveValue('+55 11 97687-1674');
  });
});