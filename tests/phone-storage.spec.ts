import { test, expect } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  return `digits${ts}@example.com`;
}

test('Armazena telefone apenas com dígitos', async ({ request }) => {
  test.skip();
  const email = uniqueEmail();
  const register = await request.post('/api/auth/register', {
    data: {
      name: 'Digits Only',
      email,
      phone: '+55 11 97687-1674',
      password: 'SenhaSegura123'
    }
  });
  expect(register.ok()).toBeTruthy();

  const login = await request.post('/api/auth/login', {
    data: {
      emailOrPhone: '5511976871674',
      password: 'SenhaSegura123'
    }
  });
  if(!login.ok()){
    const err = await login.json();
    throw new Error(`Login falhou: ${JSON.stringify(err)}`);
  }
  const data = await login.json();
  expect(data.user.phone).toBe('5511976871674');
});