import fs from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";
import { writeFile as writeFileAsync } from "fs/promises";

export const uploadFileToDisk = async (file: File, absolutePath: string) => {
    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        return pipeline(
            Readable.from(fileBuffer),
            fs.createWriteStream(absolutePath)
        );
    } catch (error) {
        throw new Error("Something went wrong, while uploading file disk");
    }
};

export const uploadFile = async (
    buffer: ArrayBuffer,
    fileName: string,
    extension: string,
    fileAbsolutePath: string
) => {
    try {
        await writeFileAsync(fileAbsolutePath, Buffer.from(buffer));
    } catch (error) {
        console.log("Error writing file: ", error);
    }
};
