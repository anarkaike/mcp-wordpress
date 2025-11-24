import { test, expect } from '@playwright/test';
import { normalizePhone } from '../src/validation.js';

test.describe('normalizePhone', () => {
  test('remove máscara e + mantendo apenas dígitos', () => {
    expect(normalizePhone('+55 11 97687-1674')).toBe('5511976871674');
    expect(normalizePhone('(11) 97687-1674')).toBe('11976871674');
    expect(normalizePhone('5511976871674')).toBe('5511976871674');
    expect(normalizePhone('')).toBe('');
  });
});