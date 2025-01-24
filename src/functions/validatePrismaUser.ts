import { PrismaUser, PrismaUserSchema } from "../types/prismaTypes";


export const validatePrismaUser = (user: unknown): PrismaUser => {
  try {
    return PrismaUserSchema.parse(user);
  } catch (error) {
    console.error('Invalid user data:', error);
    throw new Error('User data validation failed.');
  }
};