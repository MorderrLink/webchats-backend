import '@types/express';

declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                sessionId: string;
                actor: string;
            };
        }
    }
}
