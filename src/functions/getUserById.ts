import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()

export const getUserById = async (userId: string) => {
    
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                chats: true
            }
        });
        return user
    } catch (error) {
        console.error(error);
    }
}


export const getUserWithChatsById = async (userId: string) => {
    const prisma = new PrismaClient()
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                chats: {
                    select: {
                        users: {
                            select: {
                                _count: true,
                                name: true,
                                imageUrl: true,
                            }
                        },
                        messages: true,
                        id: true,
                        updatedAt: true
                    }
                },
            }
        });
        return user
    } catch (error) {
        console.error(error);
    }
}

export const getSearchUsers = async (input: string) => {
    try {
            
        const results = await prisma.user.findMany({
            where: {
                name: {
                    contains: input,
                    mode: 'insensitive',
                },
            },
            select: {
                id: true,
                name: true,
                imageUrl: true,
            }
        });

        return results

    } catch (error) {
        console.error(error);
    }
}
