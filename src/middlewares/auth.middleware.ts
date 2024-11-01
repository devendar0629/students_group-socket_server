import { Socket } from "socket.io";
import cookie from "cookie";
import { decode } from "next-auth/jwt";

export const authMiddleware = async function (
    socket: Socket,
    next: (err?: Error) => void
) {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");

    const authToken =
        cookies[process.env.CK_NAME!] ||
        socket.handshake.headers.authorization?.split(" ")[1];

    if (!authToken) {
        next(new Error("Unauthenticated request"));
    }

    let decodedTokenPayload: any;

    try {
        decodedTokenPayload = await decode({
            secret: process.env.NEXTAUTH_SECRET!,
            token: authToken,
        });

        if (!decodedTokenPayload) throw new Error("Unauthenticated request");

        socket.user = decodedTokenPayload;
        socket.authToken = authToken!;
    } catch (error) {
        next(new Error("Unauthenticated request"));
    }

    console.log(
        `🔓 Socket id:${socket.id} successfully authenticated to ${socket.nsp.name} namespace !`
    );

    next();
};
