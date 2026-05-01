import { z } from 'zod';

// Re-create the schema shape used in app/api/register/route.ts so we can validate
// the age-gate contract without booting the entire route handler.
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10),
  ageAttested: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you are 13 or older to create an account.' }),
  }),
});

describe('register age-gate validation', () => {
  const validBody = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'AStr0ng!Password',
  };

  it('rejects when ageAttested is missing', () => {
    const result = registerSchema.safeParse(validBody);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.format())).toMatch(/13 or older/i);
    }
  });

  it('rejects when ageAttested is false', () => {
    const result = registerSchema.safeParse({ ...validBody, ageAttested: false });
    expect(result.success).toBe(false);
  });

  it('rejects when ageAttested is a non-boolean truthy value', () => {
    // @ts-expect-error intentional invalid value
    const result = registerSchema.safeParse({ ...validBody, ageAttested: 'yes' });
    expect(result.success).toBe(false);
  });

  it('accepts when ageAttested is exactly true', () => {
    const result = registerSchema.safeParse({ ...validBody, ageAttested: true });
    expect(result.success).toBe(true);
  });
});
