import { describe, expect, it } from 'vitest';
import validation from '../src/validation.js';

const { clientSchema, contractSchema, parse, userSchema } = validation;

describe('validación de reglas de negocio', () => {
  it('normaliza el correo de un cliente válido', () => {
    const client = parse(clientSchema, {
      name: 'Contacto Vitest',
      company: 'Empresa de prueba',
      email: 'QA@EXAMPLE.CL',
      bankAccount: '1234 5678'
    });

    expect(client.email).toBe('qa@example.cl');
  });

  it('rechaza un correo inválido y notas demasiado extensas', () => {
    expect(() => parse(clientSchema, {
      name: 'Cliente',
      company: 'Empresa',
      email: 'no-es-correo',
      notes: 'x'.repeat(1001)
    })).toThrow(/Invalid email|Too big/i);
  });

  it('acepta valor contractual cero y fechas iguales', () => {
    const contract = parse(contractSchema, {
      clientId: '1',
      number: 'AT-VITEST-1',
      title: 'Contrato válido',
      value: '0',
      status: 'pendiente',
      startDate: '2026-01-01',
      endDate: '2026-01-01',
      manager: 'QA'
    });

    expect(contract.value).toBe(0);
  });

  it('aplica la política de contraseña documentada', () => {
    expect(() => parse(userSchema, {
      name: 'Usuario',
      email: 'user@example.cl',
      password: 'weak',
      role: 'editor'
    })).toThrow();
  });
});
