
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {editUserProfile, editUsername, UserProfile, UserProfileResponse} from "@/client/signalr/profileClient";
import { uploadProfileImage } from "@/client/api/cloudinaryClient";
import {ThemeColors} from "@/theme/themes";
import { BlurView } from "expo-blur";
import {useAuth} from "@/context/AuthContext";

interface EditProfileModalProps {
    visible: boolean;
    token: string;
    userId: number;
    profile: UserProfileResponse;
    colours: ThemeColors
    onClose: () => void;
    onSaved: (profile: UserProfileResponse) => void;
}

const BIO_MAX_LENGTH = 300;

const generateUsernameSuggestions = (username: string): string[] => {
    const base = username.trim().replace(/\s+/g, "_");

    if (!base) {
        return [];
    }

    return [`${base}1`, `${base}2`, `${base}_1`];
};

export default function EditProfileModal({
                                             visible,
                                             token,
                                             userId,
                                             profile,
                                             colours,
                                             onClose,
                                             onSaved,
                                         }: EditProfileModalProps) {
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [bio, setBio] = useState("");
    const [profileImage, setProfileImage] = useState<string | null>(
        profile?.profileImage ?? null
    );
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaveHovered, setIsSaveHovered] = useState(false);
    const [isCancelHovered, setIsCancelHovered] = useState(false);
    const [isPhotoHovered, setIsPhotoHovered] = useState(false);
    const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
    const {preferences, user} = useAuth()

    const currentProfile = preferences?.userProfileResponse ?? profile;

    useEffect(() => {
        if (!visible) return;

        setUsername(currentProfile?.username ?? user?.username ?? "");
        setFirstName(currentProfile?.firstname ?? user?.firstName ?? "");
        setLastName(currentProfile?.lastname ?? user?.lastName ?? "");
        setBio(currentProfile?.bio ?? "");
        setProfileImage(currentProfile?.profileImage ?? null);
        setSelectedImageUri(null);
        setError(null);
        setUsernameSuggestions([]);
    }, [visible, currentProfile, user]);

    const pickImage = async () => {
        try {
            const permission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                setError(
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
                const uri = result.assets[0].uri;

                setSelectedImageUri(uri);
                setProfileImage(uri);
                setError(null);
            }
        } catch (err) {
            console.error("Failed to select profile image:", err);
            setError("Unable to select that image. Please try again.");
        }
    };

    const handleSave = async () => {
        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            setError("Username cannot be empty.");
            return;
        }

        if (!token) {
            setError("You are not currently authenticated.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let cloudinaryUrl = profile?.profileImage;

            if (selectedImageUri) {
                cloudinaryUrl = await uploadProfileImage(selectedImageUri);
            }

            const updatedProfile: UserProfile = {
                userId,
                firstname: firstName.trim(),
                lastname: lastName.trim(),
                profileImage: cloudinaryUrl ?? undefined,
                bio: bio.trim(),
            };

            const profileResponse = await editUserProfile(
                token,
                updatedProfile
            );

            let updatedUsername = profile?.username ?? "";

            if (trimmedUsername !== (profile?.username ?? "")) {
                const usernameResponse = await editUsername(
                    token,
                    trimmedUsername,
                    userId
                );

                updatedUsername = usernameResponse.username ?? trimmedUsername;
            }

            onSaved({
                ...profileResponse,
                userId,
                firstname: profileResponse.firstname ?? firstName.trim(),
                lastname: profileResponse.lastname ?? lastName.trim(),
                profileImage:
                    profileResponse.profileImage ?? cloudinaryUrl ?? undefined,
                bio: profileResponse.bio ?? bio.trim(),
                username: updatedUsername,
                email: profileResponse.email ?? profile?.email,
            });

            onClose();
        } catch (err) {
            console.error("Failed to update profile:", err);

            const message =
                err instanceof Error
                    ? err.message
                    : "Something went wrong while updating your profile.";

            if (message.toLowerCase().includes("already in use")) {
                setError("That username is already taken.");

                setUsernameSuggestions(
                    generateUsernameSuggestions(username)
                );
            } else {
                setError(message);
                setUsernameSuggestions([])
            }
        } finally {
            setIsLoading(false);
        }
    };

    const inputClassName =
        "mt-2 w-full rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text outline-none";

    const inputStyle = {
        backgroundColor: colours.background,
        borderColor: colours.border,
        color: colours.text,
    };

    const placeholderColor = colours.textMuted;

    const cardStyle = {
        backgroundColor: colours.surface,
        borderColor: colours.border,
    };

    const cancelButtonStyle = {
        backgroundColor: colours.background,
        borderColor: colours.border,
    };

    const saveButtonStyle = {
        backgroundColor: colours.primary,
    };


    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={() => {
                if (!isLoading) onClose();
            }}
            statusBarTranslucent
        >
            <View className="flex-1 items-center justify-center px-4 py-6">

                <BlurView
                    intensity={35}
                    tint="dark"
                    className="absolute inset-0"
                />
                <View
                    className="absolute inset-0"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
                />

                <View
                    className="max-h-[90%] w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl"
                    style={cardStyle}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerClassName="p-5 sm:p-8"
                    >
                        <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-4">
                                <Text
                                    className="text-2xl font-bold"
                                    style={{ color: colours.text }}
                                >
                                    Edit your profile
                                </Text>
                                <Text
                                    className="mt-2 text-sm leading-5"
                                    style={{ color: colours.textMuted }}
                                >
                                    Update your details and how you appear
                                    to other people.
                                </Text>
                            </View>

                            <Pressable
                                onPress={onClose}
                                disabled={isLoading}
                                accessibilityRole="button"
                                accessibilityLabel="Close edit profile"
                                className="h-9 w-9 items-center justify-center rounded-full"
                                style={{ backgroundColor: colours.background }}
                            >
                                <Text
                                    className="text-xl"
                                    style={{ color: colours.textMuted }}
                                >
                                    ×
                                </Text>
                            </Pressable>
                        </View>

                        <View className="mt-7 items-center">
                            <Pressable
                                onPress={pickImage}
                                onHoverIn={() => setIsPhotoHovered(true)}
                                onHoverOut={() => setIsPhotoHovered(false)}
                                disabled={isLoading}
                                accessibilityRole="button"
                                accessibilityLabel="Choose profile picture"
                                className="h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2"
                                style={{
                                    borderColor: isPhotoHovered
                                        ? colours.primary
                                        : colours.border,
                                }}
                            >
                                {profileImage ? (
                                    <Image
                                        source={{ uri: profileImage }}
                                        className="h-full w-full"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View
                                        className="h-full w-full items-center justify-center"
                                        style={{
                                            backgroundColor: colours.background,
                                        }}
                                    >
                                        <Text
                                            className="text-sm font-semibold"
                                            style={{
                                                color: colours.textMuted,
                                            }}
                                        >
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
                                <Text
                                    className="font-semibold"
                                    style={{ color: colours.primary }}
                                >
                                    {profileImage
                                        ? "Change profile picture"
                                        : "Choose profile picture"}
                                </Text>
                            </Pressable>
                        </View>

                        <View className="mt-5">
                            <Text
                                className="text-sm font-bold"
                                style={{ color: colours.text }}
                            >
                                Username
                            </Text>
                            <TextInput
                                value={username}
                                onChangeText={(value) => {
                                    setUsername(value);
                                    setUsernameSuggestions([]);
                                    setError(null);
                                }}
                                placeholder="Choose a username"
                                placeholderTextColor={placeholderColor}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isLoading}
                                maxLength={50}
                                className="mt-2 w-full rounded-xl border px-4 py-3 text-base outline-none"
                                style={inputStyle}
                            />

                            {usernameSuggestions.length > 0 && (
                                <View className="mt-3">
                                    <Text
                                        className="mb-2 text-sm"
                                        style={{ color: colours.textMuted }}
                                    >
                                        Try one of these instead:
                                    </Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {usernameSuggestions.map((suggestion) => (
                                            <Pressable
                                                key={suggestion}
                                                onPress={() => {
                                                    setUsername(suggestion);
                                                    setError(null);
                                                    setUsernameSuggestions([]);
                                                }}
                                                disabled={isLoading}
                                                className="rounded-lg border px-3 py-2"
                                                style={{
                                                    backgroundColor:
                                                    colours.background,
                                                    borderColor: colours.border,
                                                }}
                                            >
                                                <Text
                                                    className="font-semibold"
                                                    style={{
                                                        color: colours.primary,
                                                    }}
                                                >
                                                    {suggestion}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>

                        <View className="mt-5 flex-row flex-wrap gap-4">
                            <View className="min-w-0 flex-1">
                                <Text
                                    className="text-sm font-bold"
                                    style={{ color: colours.text }}
                                >
                                    First name
                                </Text>
                                <TextInput
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    placeholder="First name"
                                    placeholderTextColor={placeholderColor}
                                    autoCapitalize="words"
                                    editable={!isLoading}
                                    className="mt-2 w-full rounded-xl border px-4 py-3 text-base"
                                    style={inputStyle}
                                />
                            </View>

                            <View className="min-w-0 flex-1">
                                <Text
                                    className="text-sm font-bold"
                                    style={{ color: colours.text }}
                                >
                                    Last name
                                </Text>
                                <TextInput
                                    value={lastName}
                                    onChangeText={setLastName}
                                    placeholder="Last name"
                                    placeholderTextColor={placeholderColor}
                                    autoCapitalize="words"
                                    editable={!isLoading}
                                    className="mt-2 w-full rounded-xl border px-4 py-3 text-base"
                                    style={inputStyle}
                                />
                            </View>
                        </View>

                        <View className="mt-5">
                            <View className="flex-row items-center justify-between">
                                <Text
                                    className="text-sm font-bold"
                                    style={{ color: colours.text }}
                                >
                                    Bio
                                </Text>
                                <Text
                                    className="text-xs"
                                    style={{ color: colours.textMuted }}
                                >
                                    {bio.length}/{BIO_MAX_LENGTH}
                                </Text>
                            </View>

                            <TextInput
                                value={bio}
                                onChangeText={(value) =>
                                    setBio(value.slice(0, BIO_MAX_LENGTH))
                                }
                                placeholder="Tell people a little about yourself..."
                                placeholderTextColor={placeholderColor}
                                multiline
                                textAlignVertical="top"
                                editable={!isLoading}
                                className="mt-2 h-32 w-full rounded-xl border px-4 py-3 text-base"
                                style={inputStyle}
                            />
                        </View>

                        {error ? (
                            <View className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
                                <Text className="text-sm text-red-700">
                                    {error}
                                </Text>
                            </View>
                        ) : null}

                        <View className="mt-7 flex-row gap-3">
                            <Pressable
                                onPress={onClose}
                                disabled={isLoading}
                                onHoverIn={() => setIsCancelHovered(true)}
                                onHoverOut={() => setIsCancelHovered(false)}
                                className="min-h-12 flex-1 items-center justify-center rounded-xl border px-4 py-3"
                                style={{
                                    ...cancelButtonStyle,
                                    backgroundColor: isCancelHovered
                                        ? colours.border
                                        : colours.background,
                                }}
                            >
                                <Text
                                    className="font-semibold"
                                    style={{ color: colours.text }}
                                >
                                    Cancel
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleSave}
                                disabled={isLoading}
                                onHoverIn={() => setIsSaveHovered(true)}
                                onHoverOut={() => setIsSaveHovered(false)}
                                className={`min-h-12 flex-1 flex-row items-center justify-center rounded-xl px-4 py-3 ${
                                    isLoading ? "opacity-60" : ""
                                }`}
                                style={{
                                    backgroundColor: isSaveHovered
                                        ? colours.primaryDark
                                        : colours.primary,
                                }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={colours.textLight} />
                                ) : (
                                    <Text
                                        className="font-bold"
                                        style={saveButtonStyle}
                                    >
                                        Save changes
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

}
