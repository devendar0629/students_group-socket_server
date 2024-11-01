import { config } from "dotenv";
config({
    path: ".env",
});
import { connectDB } from "./lib/db/db.js";
await connectDB();

import http from "http";
import { Server } from "socket.io";
import e from "express";
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { mimeToExtension } from "../constants/index.js";
import { createMessage } from "./services/message.service.js";
import User from "./models/user.model.js";

const app = e();
app.use(e.json());
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
    },
    maxHttpBufferSize: 1e8 * 5.12, // 512 MB
});

io.use(authMiddleware);
io.use((socket, next) => {
    try {
        socket.join(`U__${socket.user._id}`);
        next();
    } catch (error) {
        next(new Error("Something went wrong"));
    }
});

interface ClientMessage {
    roomName: string;

    mediaFile: {
        buffer: ArrayBuffer | null;
        mimeType: keyof typeof mimeToExtension;
        fileNameWithoutExtension: string;
    };

    content: string;
}
interface ClientFriendRequest {
    username: string;
    sentOn: string;
}

io.on("connection", async (socket) => {
    let joinedGroups = null;

    try {
        const response = await fetch(
            `${process.env.CLIENT_URL}/api/v1/users/groups`,
            {
                cache: "no-store",
                headers: {
                    Authorization: `Bearer ${socket.authToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(
                "Something went wrong while fetching the user's groups"
            );
        }

        const data = await response.json();

        if (!data) {
            throw new Error("Something went wrong while joining the groups");
        }

        joinedGroups = data.data?.joinedGroups;
    } catch (error: any) {
        socket.emit("server_error-group-join", {
            message:
                error.message ||
                "Something went wrong while joining the groups",
        });
    }

    for await (const group of joinedGroups) {
        socket.join(`G__${group._id}`);
    }

    socket.emit("server_joined-groups", joinedGroups);

    socket.on(
        "chat:client_group-message",
        async (messageData: ClientMessage, cb: unknown) => {
            // block the user , if they're not in the group
            if (!socket.rooms.has(messageData.roomName)) {
                console.log(
                    `⚔️  Blocked ${socket.id} from messaging in ${messageData.roomName}`
                );

                typeof cb === "function" &&
                    cb(new Error("Permission denied"), null);

                return;
            }
            const groupId = messageData.roomName?.slice(3);

            try {
                const messageCreationResult = await createMessage(
                    socket.user?._id!,
                    groupId,
                    messageData
                );

                typeof cb === "function" && cb(null, messageCreationResult);

                // Emit the message to all the group members
                io.to(messageData.roomName).emit(
                    "chat:server_group-message",
                    groupId,
                    messageCreationResult
                );

                // Emit a notification to all group members
                if (messageCreationResult.message.mediaFile) {
                    io.to(messageData.roomName).emit(
                        "notification:server_group-message",
                        {
                            _id: messageData.roomName.slice(3),
                            groupName: messageCreationResult.groupName,
                            message: {
                                _id: messageCreationResult.message._id,
                                sender: {
                                    _id: socket.user._id,
                                    username: socket.user.username,
                                    name: socket.user.name,
                                },
                                content: messageCreationResult.message.content,
                                createdAt:
                                    messageCreationResult.message.createdAt,
                                updatedAt:
                                    messageCreationResult.message.updatedAt,
                                mediaFile:
                                    messageCreationResult.message.mediaFile,
                            },
                        }
                    );
                } else {
                    io.to(messageData.roomName).emit(
                        "notification:server_group-message",
                        {
                            _id: messageData.roomName.slice(3),
                            groupName: messageCreationResult.groupName,
                            message: {
                                _id: messageCreationResult.message._id,
                                sender: {
                                    _id: socket.user._id,
                                    username: socket.user.username,
                                    name: socket.user.name,
                                },
                                content: messageCreationResult.message.content,
                                createdAt:
                                    messageCreationResult.message.createdAt,
                                updatedAt:
                                    messageCreationResult.message.updatedAt,
                            },
                        }
                    );
                }
            } catch (error: any) {
                console.error(error);

                typeof cb === "function" && cb(error.message, null);
            }
        }
    );

    socket.on(
        "notification:client_friend-request",
        async (data: ClientFriendRequest, cb: unknown) => {
            try {
                const _ = new Date(data.sentOn);
                if (isNaN(_.getTime())) {
                    if (typeof cb === "function") {
                        cb(new Error("Invalid payload"), null);
                    }

                    return;
                }

                if (!data.username?.trim()) {
                    if (typeof cb === "function") {
                        cb(new Error("Invalid payload"), null);
                    }

                    return;
                }

                const user = await User.findOne({
                    username: data.username,
                });

                if (!user) {
                    if (typeof cb === "function") {
                        cb(new Error("Invalid username"), null);
                    }

                    return;
                }

                io.to(`U__${user._id.toString()}`).emit(
                    "notification:server_friend-request",
                    {
                        sentBy: {
                            _id: socket.user._id,
                            username: socket.user.username,
                        },
                        sentOn: data.sentOn,
                    }
                );

                typeof cb === "function" &&
                    cb(null, "Friend request notified successfully !");
            } catch (error) {
                typeof cb === "function" && cb("Something went wrong !");

                console.log(
                    "Error when sending friend request notification: ",
                    error
                );
            }
        }
    );

    socket.on("disconnect", () => {
        console.log(`⛔ Socket id: ${socket.id} disconnected ..`);
    });
});

/*
    For uniqueness and distinction, the groups room names are prefixed with 'G__' and
    actual user id is prefixed with 'U__'
*/

app.get("/ping", (req, res) => {
    return res
        .json({
            message: "The server is up .",
        })
        .status(200);
});

const PORT = process.env.PORT || 8000;

httpServer.listen(PORT, () => {
    console.log("Server started at port:", PORT);
});
