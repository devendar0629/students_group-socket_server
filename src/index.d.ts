import { JWT } from "next-auth/jwt";
import type { Socket } from "socket.io";

interface CustomJWTPayload {
    avatar: string;
    username: string;
    isVerified: boolean;
    _id: string;
    email: string;
}

declare module "socket.io" {
    interface Socket {
        user: JWT & CustomJWTPayload;
        authToken: string;
    }
}
