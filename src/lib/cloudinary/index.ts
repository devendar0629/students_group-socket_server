import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";

export const uploadAsset = (
    localFilePath: string,
    options: UploadApiOptions
) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    try {
        return cloudinary.uploader.upload(localFilePath, {
            ...options,
        });
    } catch (error: any) {
        throw new Error(`Error uploading asset: ${error.message}`);
    }
};
