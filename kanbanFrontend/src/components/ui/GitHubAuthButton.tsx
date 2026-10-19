
import { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    Text,
    View
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import {
    githubLoginUrl,
    githubLoginClient
} from "@/client/api/apiClient";
import { SvgUri } from "react-native-svg";

type GitHubAuthButtonProps = {
    isLogin: boolean;
    isLoading?: boolean;
    onError: (message: string) => void;
};

export default function GitHubAuthButton({
                                             isLogin,
                                             isLoading = false,
                                             onError
                                         }: GitHubAuthButtonProps) {
    const { login } = useAuth();
    const [isGitHubLoading, setIsGitHubLoading] = useState(false);

    const handleGitHubLogin = async () => {
        onError("");

        if (Platform.OS === "web") {
            window.location.assign(`${githubLoginUrl}?platform=web`);
            return;
        }

        try {
            setIsGitHubLoading(true);

            const redirectUrl = "kanbanfrontend://auth/github";

            const result = await WebBrowser.openAuthSessionAsync(
                githubLoginUrl,
                redirectUrl
            );

            if (result.type !== "success" || !result.url) {
                if (
                    result.type === "cancel" ||
                    result.type === "dismiss"
                ) {
                    return;
                }

                throw new Error("GitHub sign-in did not complete.");
            }

            const parsedUrl = Linking.parse(result.url);
            const ticket = parsedUrl.queryParams?.ticket;

            if (typeof ticket !== "string" || !ticket) {
                throw new Error(
                    "GitHub sign-in did not return a valid login ticket."
                );
            }

            const response = await githubLoginClient(ticket);

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
                    : "Something went wrong while signing in with GitHub."
            );
        } finally {
            setIsGitHubLoading(false);
        }
    };

    return (
        <>
            <Pressable
                onPress={handleGitHubLogin}
                disabled={isLoading || isGitHubLoading}
                style={({ pressed }) => [
                    { opacity: pressed ? 0.8 : 1 }
                ]}
                className="mb-5 w-[100%] flex-row items-center justify-center rounded-xl border border-theme-border bg-theme-surface px-[5%] py-4 shadow-sm"
            >
                {isGitHubLoading ? (
                    <ActivityIndicator
                        size="small"
                        className="py-0.5"
                    />
                ) : (
                    <View className="w-[100%] flex-row items-center justify-center">
                        <SvgUri
                            uri="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
                            style={{
                                width: "8%",
                                height: "auto",
                                aspectRatio: 1
                            }}
                            className="mr-[4%]"
                        />

                        <Text className="text-center font-medium text-theme-text text-base">
                            {isLogin
                                ? "Continue with GitHub"
                                : "Register with GitHub"}
                        </Text>
                    </View>
                )}
            </Pressable>

        </>
    );
}
