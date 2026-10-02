import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/context/AuthContext";
import { editUserProfile } from "@/client/signalr/profileClient";
import { uploadProfileImage } from "@/client/api/cloudinaryClient";

interface CreateProfileProps {
    onComplete: () => void;
    onSkip: () => void;
}

const BIO_MAX_LENGTH = 500;

export default function CreateProfile({
                                          onComplete,
                                          onSkip,
                                      }: CreateProfileProps) {
    const { token } = useAuth();

    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [bio, setBio] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const pickImage = async () => {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                "Permission required",
                "Please allow access to your photo library to choose a profile picture."
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const handleCreateProfile = async () => {
        if (!token) {
            Alert.alert(
                "Authentication error",
                "You are not currently authenticated."
            );
            return;
        }

        setIsLoading(true);

        try {
            let cloudinaryUrl: string | undefined;

            if (profileImage) {
                cloudinaryUrl = await uploadProfileImage(profileImage);
            }

            await editUserProfile(token, {
                profileImage: cloudinaryUrl,
                bio: bio.trim(),
            });

            onComplete();
        } catch (error) {
            console.error("Failed to create profile:", error);

            Alert.alert(
                "Unable to create profile",
                error instanceof Error
                    ? error.message
                    : "Something went wrong while creating your profile."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="absolute inset-0 z-50 items-center justify-center bg-theme-primary/60 px-5">
            <View className="w-full max-w-xl rounded-2xl border border-theme-border bg-theme-surfaceLight p-6 shadow-2xl">
                <Text className="text-center text-2xl font-bold text-theme-text">
                    Create your profile
                </Text>

                <Text className="mt-2 text-center text-sm leading-5 text-theme-textMuted">
                    Add a profile picture and tell people a little about
                    yourself.
                </Text>


                <View className="mt-7 items-center">
                    <Pressable
                        onPress={pickImage}
                        disabled={isLoading}
                        className="h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-theme-borderDark bg-theme-surface"
                    >
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                className="h-full w-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="items-center px-4">
                                <Text className="text-center text-sm font-semibold text-theme-textMuted">
                                    Add photo
                                </Text>
                            </View>
                        )}
                    </Pressable>

                    <Pressable
                        onPress={pickImage}
                        disabled={isLoading}
                        className="mt-3 rounded-lg px-3 py-2"
                    >
                        <Text className="font-semibold text-theme-primary">
                            {profileImage
                                ? "Change profile picture"
                                : "Choose profile picture"}
                        </Text>
                    </Pressable>
                </View>

                <View className="mt-5">
                    <View className="mb-2 flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-theme-text">
                            Bio
                        </Text>

                        <Text className="text-xs text-theme-textMuted">
                            {bio.length}/{BIO_MAX_LENGTH}
                        </Text>
                    </View>

                    <TextInput
                        value={bio}
                        onChangeText={(value) =>
                            setBio(value.slice(0, BIO_MAX_LENGTH))
                        }
                        placeholder="Tell people a little about yourself..."
                        placeholderTextColor="#80664b"
                        multiline
                        textAlignVertical="top"
                        maxLength={BIO_MAX_LENGTH}
                        editable={!isLoading}
                        className="h-32 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                    />
                </View>

                <View className="mt-6">
                    <Pressable
                        onPress={handleCreateProfile}
                        disabled={isLoading}
                        className={`min-h-12 items-center justify-center rounded-xl bg-theme-primary px-5 ${
                            isLoading ? "opacity-60" : ""
                        }`}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff5e6" />
                        ) : (
                            <Text className="font-bold text-theme-textLight">
                                Create profile
                            </Text>
                        )}
                    </Pressable>

                    <Pressable
                        onPress={onSkip}
                        disabled={isLoading}
                        className="mt-2 items-center py-3"
                    >
                        <Text className="font-semibold text-theme-textMuted">
                            Skip for now
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}