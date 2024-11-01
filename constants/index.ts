export const ACCEPTED_MEDIA_MIMES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "audio/mpeg",
    "video/mp4",
    "video/mpeg",
    "application/pdf",
    "application/msword",
];

export const mimeToExtension = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "audio/mpeg": ".mp3",
    "video/mp4": ".mp4",
    "video/mpeg": ".mpeg",
    "application/pdf": ".pdf",
    "application/msword": ".doc",
};

export const MAX_MEDIA_SIZE_IN_BYTES = 1024 * 1024 * 512; // 512 MB (or) 536870912 bytes
