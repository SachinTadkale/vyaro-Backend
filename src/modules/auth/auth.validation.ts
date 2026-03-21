import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),

  email: z.string().email({
    message: "Invalid email",
  }),

  phone_no: z.string().regex(/^[0-9]{10}$/, {
    message: "Phone number must be exactly 10 digits",
  }),

  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),

  address: z.string().min(1, {
    message: "Address is required",
  }),
});
