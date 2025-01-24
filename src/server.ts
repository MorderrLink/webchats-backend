import express, { NextFunction, Request, Response } from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import webPush from 'web-push';
import WebSocket, { WebSocketServer } from 'ws';
import { clerkMiddleware, createClerkClient } from "@clerk/express";
import { validatePrismaUser } from "./functions/validatePrismaUser";
import { createNewUser } from "./functions/createNewUser";
import { getUserById, getUserWithChatsById } from "./functions/getUserById";
import { getSearchUsers } from "./functions/getUserById";
import { createChat, findChat } from "./functions/find-create-chat";
import { getChatById } from "./functions/getChat";
import { createNewMessage, deleteMessage, updateMessage } from "./functions/messages";
import { PrismaClient } from "@prisma/client";





dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;


app.use(express.json());
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

const clerkClient = createClerkClient({ apiUrl: process.env.CLERK_API_URL!, publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY! })
app.use(clerkMiddleware({ clerkClient }))

const prisma = new PrismaClient()

webPush.setVapidDetails(
  "mailto:alekseiburmenskiy@gmail.com",
  process.env.publicVapidKey!,
  process.env.privateVapidKey!
)

app.post('/webhook', (req: Request, res: Response, next: NextFunction): void | Promise<void> => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
}, express.json(), (req: Request, res: Response) => {
    const { type, data } = req.body;
    
    if (type === 'user.created') {

        const newUserObject = {
            name: data.first_name + " " + data.last_name,
            id: data.id,
            imageUrl: data.profile_image_url,
        }

        const validUser = validatePrismaUser(newUserObject);

        if (validUser) {
            createNewUser(validUser);
        }


    }

    res.status(200);
});

app.post(`/api/get-user`, async (req: Request, res: Response) => {

  const { userId } = req.body;
  console.log("User id is",userId )

  const user = await getUserById(userId);

  console.log("USER")
  console.log(user)
  res.status(200).json({ user })

})

app.post(`/api/get-user-with-chats`, async (req: Request, res: Response) => {
  const { userId } = req.body;

  const user = await getUserWithChatsById(userId);

  res.status(200).json(user)

})

app.post(`/api/search-users`, async (req: Request, res: Response) => {

  const { input } = req.body;
  const results = await getSearchUsers(input);

  res.status(200).json({ results })

})

app.post(`/api/find-or-create-chat`, async (req: Request, res: Response) => {
  
  const { userId, peerId } = req.body;
  const chatId = await findChat({ peerId: peerId, userId: userId });
  
  if (chatId) {
    console.log("FOUND CHAT WITH ID", chatId);
    res.status(200).json({ chatId });
  } else {
    const chatId = await createChat({ peerId: peerId, userId: userId });
    if (chatId) {
      console.log("CREATED CHAT WITH ID", chatId);
      res.status(200).json({ chatId });
    } else {
      console.error("Something went wrong. Chat has not created");
    }
  }

})

app.post(`/api/get-chat-by-id`, async (req: Request, res: Response) => {

  const { chatId } = req.body;
  const chat = await getChatById(chatId);

  res.status(200).json({ chat })

})

app.post('/api/save-subscription', async (req: Request, res: Response) => {
  const { endpoint, keys, userId } = req.body;

  try {
    if (!userId) return;

    await prisma.pushSubscription.upsert({
      where: { endpoint: endpoint },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: userId },
      update: { p256dh: keys.p256dh, auth: keys.auth }
    })
    res.status(201).json({ message: 'Subscription saved or updated.' });
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to save a subscription" });
  }
})



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});






const server = new WebSocketServer({ port: 8000 });

const clients: Record<string, WebSocket> = {};

server.on('connection', (socket) => {
  let userId: string | null = null;

  socket.on('message', (message) => {
    const parsedMessage = JSON.parse(message.toString());
    
    if (parsedMessage.type === 'auth') {
      userId = parsedMessage.userId;

      if (!userId) return;

      clients[userId] = socket;
      console.log(`User connected: ${userId}`);
      return;
    }

    if (!userId) {
      console.error('Unauthenticated user');
      return;
    }

    switch (parsedMessage.type) {
      case 'message-create': {
        const { content, toId, id, author, createdAt, updatedAt, chatId } = parsedMessage;
        
        if (chatId === undefined) {
          console.error("[message-create] Received a message with chatId === undefined!!!");
          break;
        }
        if (toId && clients[toId]) { 
          clients[toId].send(JSON.stringify({ type: 'message-create', id: id, author: author, createdAt: createdAt, updatedAt: updatedAt, content: content }));
        }

        console.log("starting to create")
          createNewMessage({
            authorId: author.id,
            chatId: chatId,
            content: content,
            createdAt: createdAt,
            updatedAt: updatedAt
          }).then( async (msgId) => {
            return await prisma.message.findUnique({
              where: {
                id: msgId
              }
            }).then(async () => {
      console.log("Message created!");

      // Send a push notification
      try {
        
        const subscriptions = await prisma.pushSubscription.findMany({
          where: { userId: toId },
        });
        
        const notificationPayload = JSON.stringify({
          title: 'New Message',
          body: `${author.name}: ${content}`,
          data: {
            url: `/${chatId}`,
          },
          // icon: '/path/to/icon.png', // Optional: link to a notification icon
        });
        subscriptions.forEach((subscription) => {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          }
          webPush.sendNotification(pushSubscription, notificationPayload).catch((error) => {
            console.error('Error sending push notification:', error);
          });
          
        });
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }

      clients[author.id].send(JSON.stringify({ type: "enable-message-update", createdAt: createdAt }));
      });
      })
        
        break;
      }
      case "message-update" : {
        const { content, toId, id, updatedAt, chatId, createdAt, authorId } = parsedMessage;
        
        if (toId && clients[toId]) {
          clients[toId].send(JSON.stringify({ type: 'message-update', id: id, content: content, updatedAt: updatedAt, createdAt: createdAt }));
        }

        updateMessage({
          chatId: chatId,
          content: content,
          updatedAt: updatedAt,
          createdAt: createdAt,
          authorId: authorId
        })

        break;
      }
      case 'message-delete': {
        const { toId, id, content, chatId, createdAt, authorId } = parsedMessage;

        deleteMessage({
          content: content,
          chatId: chatId,
          authorId: authorId
        })

        if (toId && clients[toId]) {
          clients[toId].send(JSON.stringify({ type: 'message-delete', id: id, content: content, createdAt: createdAt, authorId: authorId }));
        }

        
        break;
      }
      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const { to } = parsedMessage;
        if (to && clients[to]) {
          clients[to].send(JSON.stringify({ ...parsedMessage, from: userId }));
        }
        break;
      }
      default:
        console.log('Unknown message type:', parsedMessage.type);
    }
  });

  socket.on('close', () => {
    if (userId) {
      console.log(`User disconnected: ${userId}`);
      delete clients[userId];
    }
  });
});





