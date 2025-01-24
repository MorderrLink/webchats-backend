import { PrismaClient } from "@prisma/client";

type findOrCreateChatParams = {
    userId: string;
    peerId: string;
}
const prisma = new PrismaClient()

export const findChat = async ({ userId, peerId }: findOrCreateChatParams) => {

    try {
        const chatId = await prisma.chat.findFirst({
            where: {
                users: {
                    every: {
                        id: {
                            in: [userId, peerId]
                        }
                    }
                }
            },
            select: {
                id: true
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return chatId

    } catch (err) {
        console.error(err)
    }
}

export const createChat = async ({ userId, peerId }: findOrCreateChatParams) => {

    try {

        const chatId = await prisma.chat.create({
            data: {
                users: {
                    connect: [
                        { id: userId },
                        { id: peerId }
                    ]
                }
            },
            select: {
                id: true,
            }
        })

        return chatId;

    } catch (err) {
        console.error(err)
    }


}