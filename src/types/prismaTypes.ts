import { z } from "zod";


export const PrismaUserSchema = z.object({
  
  name: z.string().min(1),
  id: z.string(),          
  imageUrl: z.string().url(),
  
});

export type PrismaUser = z.infer<typeof PrismaUserSchema>;