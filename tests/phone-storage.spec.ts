import { test, expect } from '@playwright/test';

function uniqueEmail() {
  const ts = Date.now();
  return `digits${ts}@example.com`;
}

test('Armazena telefone apenas com dígitos', async ({ request }) => {
  const email = uniqueEmail();
  const now = Date.now().toString();
  const last9 = now.slice(-9); // garante 9 dígitos
  const digits = `5511${last9}`;
  const masked = `+55 11 ${last9.slice(0,5)}-${last9.slice(5)}`;

  const register = await request.post('/api/auth/register', {
    data: {
      name: 'Digits Only',
      email,
      phone: masked,
      password: 'SenhaSegura123'
    }
  });
  if(!register.ok()){
    const err = await register.json();
    throw new Error(`Registro falhou: ${JSON.stringify(err)}`);
  }

  const login = await request.post('/api/auth/login', {
    data: {
      emailOrPhone: digits,
      password: 'SenhaSegura123'
    }
  });
  if(!login.ok()){
    const err = await login.json();
    throw new Error(`Login falhou: ${JSON.stringify(err)}`);
  }
  const data = await login.json();
  expect(data.user.phone).toBe(digits);
});