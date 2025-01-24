import { PrismaClient } from "@prisma/client"
import { PrismaUser } from "../types/prismaTypes"

export const createNewUser = async (validUser : PrismaUser) => {
    
    const prisma = new PrismaClient()
    try {
        await prisma.user.create({
            data: validUser
        })
        
    } catch (error) {
      console.error(error);
    }
}