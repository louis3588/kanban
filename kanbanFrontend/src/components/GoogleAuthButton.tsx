import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    Text,
    View
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { googleLoginUrl, googleLoginClient } from "@/client/api/apiClient";

type GoogleAuthButtonProps = {
    isLogin: boolean;
    isLoading?: boolean;
    onError: (message: string) => void;
};

export default function GoogleAuthButton({
    isLogin,
    isLoading = false,
    onError
}: GoogleAuthButtonProps) {
    const { login } = useAuth();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleGoogleLogin = async () => {
        onError("");

        try {
            setIsGoogleLoading(true);

            const redirectUrl = "kanbanfrontend://auth/google";

            const result = await WebBrowser.openAuthSessionAsync(
                googleLoginUrl,
                redirectUrl
            );

            if (result.type !== "success" || !result.url) {
                if (
                    result.type === "cancel" ||
                    result.type === "dismiss"
                ) {
                    return;
                }

                throw new Error("Google sign-in did not complete.");
            }

            const parsedUrl = Linking.parse(result.url);
            const ticket = parsedUrl.queryParams?.ticket;

            if (typeof ticket !== "string" || !ticket) {
                throw new Error(
                    "Google sign-in did not return a valid login ticket."
                );
            }

            const response = await googleLoginClient(ticket);

            login(response.token, {
                id: Number.parseInt(response.userId, 10),
                username: response.username,
                firstName: response.firstName,
                lastName: response.lastName || null,
                email: response.email
            });

            router.replace("/(dashboard)/workspaces");
        } catch (e) {
            onError(
                e instanceof Error
                    ? e.message
                    : "Something went wrong while signing in with Google."
            );
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <>
            <Pressable
                onPress={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
                style={({ pressed }) => [
                    { opacity: pressed ? 0.8 : 1 }
                ]}
                className="mb-5 w-[100%] flex-row items-center justify-center rounded-xl border border-theme-border bg-theme-surface px-[5%] py-4 shadow-sm"
            >
                {isGoogleLoading ? (
                    <ActivityIndicator
                        size="small"
                        className="py-0.5"
                    />
                ) : (
                    <View className="w-[100%] flex-row items-center justify-center">
                        <Image
                            source={{
                                uri: "https://freepngimg.com/thumb/google/66904-logo-now-google-plus-home-free-png-hq.png"
                            }}
                            style={{
                                width: "8%",
                                aspectRatio: 1
                            }}
                            className="mr-[4%]"
                        />

                        <Text className="text-center font-medium text-theme-text text-base">
                            {isLogin
                                ? "Continue with Google"
                                : "Register with Google"}
                        </Text>
                    </View>
                )}
            </Pressable>

            <View className="mb-5 flex-row items-center">
                <View className="h-px flex-1 bg-theme-border" />

                <Text className="mx-4 text-sm text-theme-textMuted">
                    {isLogin
                        ? "Or sign in with email"
                        : "Or register with email"}
                </Text>

                <View className="h-px flex-1 bg-theme-border" />
            </View>
        </>
    );
}