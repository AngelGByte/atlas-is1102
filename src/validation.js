const { z } = require('zod');

const text = (max, min = 1) => z.string().trim().min(min).max(max);
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Ingresa una fecha válida.');

const clientSchema = z.object({
  name: text(120),
  company: text(160),
  rut: z.string().trim().max(16).optional().default(''),
  email,
  phone: z.string().trim().max(32).optional().default(''),
  riskLevel: z.enum(['bajo', 'medio', 'alto']).default('medio'),
  status: z.enum(['activo', 'inactivo']).default('activo'),
  notes: z.string().trim().max(1000).optional().default(''),
  bankAccount: z.string().trim().refine(
    (value) => value === '' ||
      (/^[0-9 -]{6,32}$/.test(value) && value.replace(/[ -]/g, '').length >= 6),
    'La cuenta bancaria debe contener entre 6 y 30 dígitos.'
  ).optional()
});

const contractSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  number: text(40),
  title: text(180),
  value: z.coerce.number().int().min(0).max(99999999999999),
  status: z.enum(['activo', 'pendiente', 'vencido', 'terminado']),
  startDate: date,
  endDate: date,
  manager: text(120)
}).refine((value) => value.endDate >= value.startDate, {
  message: 'La fecha de término no puede ser anterior a la fecha de inicio.',
  path: ['endDate']
});

const documentSchema = z.object({
  contractId: z.coerce.number().int().positive(),
  name: text(180),
  category: text(60).default('General'),
  fileName: z.string().trim().max(180).optional().default(''),
  status: z.enum(['pendiente', 'aprobado', 'rechazado']).default('pendiente'),
  notes: z.string().trim().max(1000).optional().default('')
});

const userSchema = z.object({
  name: text(120),
  email,
  password: z.string().min(12).max(128)
    .regex(/[a-z]/, 'Incluye una minúscula.')
    .regex(/[A-Z]/, 'Incluye una mayúscula.')
    .regex(/[0-9]/, 'Incluye un número.')
    .regex(/[^A-Za-z0-9]/, 'Incluye un símbolo.'),
  role: z.enum(['admin', 'editor', 'viewer'])
});

const userUpdateSchema = z.object({
  name: text(120).optional(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  active: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0);

function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const error = new Error(result.error.issues.map((issue) => issue.message).join(' '));
    error.status = 400;
    throw error;
  }
  return result.data;
}

module.exports = {
  clientSchema,
  contractSchema,
  documentSchema,
  parse,
  userSchema,
  userUpdateSchema
};
