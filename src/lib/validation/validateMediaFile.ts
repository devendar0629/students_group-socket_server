import {
    ACCEPTED_MEDIA_MIMES,
    MAX_MEDIA_SIZE_IN_BYTES,
} from "../../../constants/index.js";

export const validateMediaFile = (
    fileBuffer: ArrayBuffer,
    mimeType: string
): boolean => {
    // validate size
    if (
        fileBuffer.byteLength >= MAX_MEDIA_SIZE_IN_BYTES ||
        fileBuffer.byteLength <= 0
    ) {
        return false;
    }

    // validate type
    if (!ACCEPTED_MEDIA_MIMES.includes(mimeType)) {
        return false;
    }

    return true;
};
