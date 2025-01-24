import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export type MessageCreateType = {
    content: string;
    authorId: string;
    chatId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type MessageUpdateType = {
    chatId: string;
    content: string;
    updatedAt: Date;
    authorId: string;
    createdAt: Date;
}


export const createNewMessage = async (message: MessageCreateType) => {

    const newMessage = await prisma.message.create({
        data: {
            content: message.content,
            authorId: message.authorId,
            chatId: message.chatId,
            createdAt: message.createdAt,
            updatedAt: message.createdAt,
        }
    })
    return newMessage.id
}

export const updateMessage = async (message: MessageUpdateType) => { 

    
    try {
        const updatingMessage = await prisma.message.findFirst({
            where: {
                chatId: message.chatId,
                authorId: message.authorId,
                createdAt: message.createdAt
            }
        })
        if (updatingMessage == null) return;

        await prisma.message.update({
            where: {
                id: updatingMessage.id,
                
            }, 
            data: { 
                content: message.content,
                updatedAt: message.updatedAt
            }
        })
    } catch (err) {
        console.error(err)
    }

}

export type MessageDeleteType = {
    content: string;
    chatId: string;
    authorId: string;
}

export const deleteMessage = async (message: MessageDeleteType) => {

    try { 
        const messageToDelete = await prisma.message.findFirst({
            where: {
                authorId: message.authorId,
                chatId: message.chatId,
                content: message.content
            }
        })

        if (!messageToDelete) return;

        await prisma.message.delete({
            where: {
                id: messageToDelete.id
            }
        })
    } catch (error) {
        console.error("[ERR:messages.ts|deleteMessage]", error);
    }


}