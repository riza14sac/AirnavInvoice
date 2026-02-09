import { z } from "zod";

export const userCreateSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1, "Name is required"),
    role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).default("OPERATOR"),
});

export type UserCreateData = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
    id: z.string().cuid(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    name: z.string().min(1).optional(),
    role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).optional(),
});

export type UserUpdateData = z.infer<typeof userUpdateSchema>;

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;
