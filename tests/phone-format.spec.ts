import { test, expect } from '@playwright/test';

test.describe('Formatação de telefone com DDI', () => {
  test('Cadastro formata 5511976871674 como +55 11 97687-1674', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.click('.tab[data-tab="register"]');
    const phone = page.locator('#reg-phone');
    await phone.fill('5511976871674');
    await expect(phone).toHaveValue('+55 11 97687-1674');
  });

  test('Cadastro aceita +5511976871674 e mantém o formato', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.click('.tab[data-tab="register"]');
    const phone = page.locator('#reg-phone');
    await phone.fill('+5511976871674');
    await expect(phone).toHaveValue('+55 11 97687-1674');
  });

  test('Cadastro aceita 005511976871674 e mostra +55 11 97687-1674', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.click('.tab[data-tab="register"]');
    const phone = page.locator('#reg-phone');
    await phone.fill('005511976871674');
    await expect(phone).toHaveValue('+55 11 97687-1674');
  });

  test('Cadastro com número local 11976871674 vira +55 11 97687-1674', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.click('.tab[data-tab="register"]');
    const phone = page.locator('#reg-phone');
    await phone.fill('11976871674');
    await expect(phone).toHaveValue('+55 11 97687-1674');
  });
});