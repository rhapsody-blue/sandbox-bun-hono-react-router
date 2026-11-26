import { z } from 'zod';

// Task base schema
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Path parameter schema for task ID
export const TaskIdParamSchema = z.object({
  id: z.string(),
});

// Create task request
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

// Update task request
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
});

// Error response schema
export const ErrorSchema = z.object({
  error: z.string(),
});
