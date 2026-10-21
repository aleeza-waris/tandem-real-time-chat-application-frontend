import { z } from "zod";

const signInBaseSchema = z.object({
  // The name field is present in the shared form values but hidden during sign in.
  name: z.string(),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(128)
});

export const signInSchema = signInBaseSchema;

export const signUpSchema = signInBaseSchema.extend({
  name: z.string().trim().min(1, "Enter your name").max(80),
  password: z.string().min(8, "Use at least 8 characters").max(128)
});

export type AuthValues = z.infer<typeof signInSchema>;
