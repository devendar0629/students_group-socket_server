import { ZodError } from "zod";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import { uploadFile } from "../../utils/uploadFileToDisk.js";
import { mimeToExtension } from "../../constants/index.js";
import { validateMediaFile } from "../lib/validation/validateMediaFile.js";
import { uploadAsset } from "../lib/cloudinary/index.js";
import Media from "../models/media.model.js";
import path from "path";
import { isValidObjectId } from "mongoose";
import { rm as rmAsync } from "fs/promises";
import User from "../models/user.model.js";
User.length;

interface MessageData {
    content: string;

    mediaFile?: {
        buffer: ArrayBuffer | null;
        fileNameWithoutExtension: string;
        mimeType: keyof typeof mimeToExtension;
    } | null;
}

// Function to create a message in the DATABASE
export const createMessage = async (
    userId: string,
    groupId: string,
    messageData: MessageData
) => {
    try {
        // Validate the group id
        if (!isValidObjectId(groupId)) throw new Error("Invalid group id");

        const group = await Group.findById(groupId);
        if (!group) {
            throw new Error("Group not found");
        }

        let message = new Message({
            sender: userId,
            content: messageData.content,
        });

        if (messageData.mediaFile && messageData.mediaFile.buffer) {
            // validate the SIZE and the TYPE
            if (
                !validateMediaFile(
                    messageData.mediaFile.buffer,
                    messageData.mediaFile.mimeType
                )
            ) {
                throw new Error("Invalid media file");
            }

            // Generate a random number for each fileName, to prevent name collisions
            const randomNumber =
                Math.floor(Math.random() * (999999998 - 100000001 + 1)) +
                100000001;
            const originalFileName =
                messageData.mediaFile.fileNameWithoutExtension +
                mimeToExtension[messageData.mediaFile.mimeType];

            const uniqueFileName = `${randomNumber}--${originalFileName}`;

            const uploadedFileAbsolutePath = path.join(
                process.cwd(),
                "uploads/temp",
                uniqueFileName
            );

            // upload the file to disk temporarily -> upload file to cloud -> save it in DB -> remove it from disk
            await uploadFile(
                messageData.mediaFile.buffer,
                messageData.mediaFile.fileNameWithoutExtension,
                mimeToExtension[messageData.mediaFile.mimeType],
                uploadedFileAbsolutePath
            )
                .then(() =>
                    uploadAsset(uploadedFileAbsolutePath, {
                        folder: "test/media",
                        resource_type: "auto",
                        public_id: uniqueFileName,
                    })
                )
                .then((resp) => {
                    const newMedia = new Media({
                        fileName: randomNumber + originalFileName,
                        link: resp.secure_url,
                        sender: userId,
                    });

                    return newMedia.save();
                })
                .then((mediaObj) => {
                    message.mediaFile = mediaObj._id;

                    rmAsync(uploadedFileAbsolutePath, {
                        maxRetries: 2,
                    });
                });
        }

        let savedMessage = await message
            .save()
            .then((msg) => msg.populate(["mediaFile", "sender"]));

        savedMessage = await savedMessage.populate([
            {
                model: "User",
                foreignField: "_id",
                localField: "sender",
                select: {
                    username: 1,
                    avatar: 1,
                    name: 1,
                },
                path: "sender",
            },
            {
                model: "Media",
                path: "mediaFile",
                foreignField: "_id",
                localField: "mediaFile",
            },
        ]);

        group.messages.push(savedMessage._id);
        await group.save();

        return { groupName: group.name, message: savedMessage };
    } catch (error: any) {
        console.log("Error creating message: ", error);

        if (error instanceof ZodError)
            throw new Error("Invalid param types for createMessage service");

        throw new Error("Something went wrong while sending the message");
    }
};
