import { Platform } from "react-native";

const CLOUD_NAME =
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

const UPLOAD_PRESET =
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const uploadProfileImage = async (
    imageUri: string
): Promise<string> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error("Cloudinary configuration is missing");
    }

    const formData = new FormData();

    if (Platform.OS === "web") {
        const imageResponse = await fetch(imageUri);
        const blob = await imageResponse.blob();

        formData.append(
            "file",
            blob,
            "profile-image.jpg"
        );
    } else {
        formData.append(
            "file",
            {
                uri: imageUri,
                type: "image/jpeg",
                name: "profile-image.jpg",
            } as any
        );
    }

    formData.append("upload_preset", UPLOAD_PRESET);

    const url =
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    const res = await fetch(url, {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(
            data?.error?.message ||
            "Failed to upload profile image."
        );
    }

    if (!data.secure_url) {
        throw new Error(
            "Cloudinary did not return an image URL."
        );
    }

    return data.secure_url;
};