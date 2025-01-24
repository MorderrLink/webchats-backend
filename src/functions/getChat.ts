import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()
export const getChatById = async (chatId: string) => {
try {

        const chat = await prisma.chat.findUnique({
            where: {
                id: chatId
            },
            select: {
                id: true,
                messages: {
                    select: {
                        content: true,
                        id: true,
                        createdAt: true,
                        updatedAt: true,
                        author: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            }
                        },

                    },
                    orderBy: {
                        createdAt: "asc"
                    }
                },
                users: {
                    select: {
                        name: true,
                        imageUrl: true,
                        id: true,
                    }
                },
                updatedAt: true,
            }
        })

        return chat;

    } catch (err) {
        console.error(err)
    }
}