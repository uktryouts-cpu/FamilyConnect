import { z } from 'zod';

export const memberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name required').max(200),
  birthDate: z.string().optional(),
  location: z.string().optional().max(200),
  occupations: z.array(z.string()).optional()
});

export const taskSchema = z.object({
  task: z.string().min(1).max(1000),
  context: z.array(memberSchema).optional()
});

export const urlSchema = z.object({
  url: z.string().url('Invalid URL')
});

export const messageSchema = z.object({
  message: z.string().min(1).max(5000)
});

export const validateRequest = (schema: z.ZodSchema, data: unknown) => {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(`Validation error: ${err.errors.map(e => e.message).join(', ')}`);
    }
    throw err;
  }
};
