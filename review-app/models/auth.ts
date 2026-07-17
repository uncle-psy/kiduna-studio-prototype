import { z } from "zod";
import { UserSchema } from "./user";

/**
 * Login request body. `handle` is the backend's term for email-or-username.
 */
export const LoginRequestSchema = z.object({
  handle: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Login response. The backend wraps the payload in `{ data: { token, user } }`.
 */
export const LoginResponseSchema = z.object({
  data: z.object({
    token: z.string().min(1),
    user: UserSchema,
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/**
 * The authenticated session we persist on the client (token + user).
 * This is what we put into the cookie/localStorage and read back across reloads.
 */
export const SessionSchema = z.object({
  token: z.string().min(1),
  user: UserSchema,
});

export type Session = z.infer<typeof SessionSchema>;
