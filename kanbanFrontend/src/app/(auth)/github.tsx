
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { githubLoginClient } from "@/client/api/apiClient";

export default function GitHubCallback() {
    const { ticket } = useLocalSearchParams<{ ticket: string }>();
    const { login } = useAuth();
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const completeLogin = async () => {
            if (!ticket || typeof ticket !== "string") {
                setError("GitHub sign-in did not return a login ticket.");
                return;
            }

            try {
                const response = await githubLoginClient(ticket);

                if (cancelled) return;

                login(response.token, {
                    id: Number.parseInt(response.userId, 10),
                    username: response.username,
                    firstName: response.firstName,
                    lastName: response.lastName || null,
                    email: response.email,
                });

                router.replace("/(dashboard)/workspaces");
            } catch (e) {
                if (cancelled) return;

                setError(
                    e instanceof Error
                        ? e.message
                        : "Unable to complete GitHub sign-in."
                );
            }
        };

        void completeLogin();

        return () => {
            cancelled = true;
        };
    }, [ticket, login]);

    return (
        <View className="flex-1 items-center justify-center bg-theme-background p-6">
            <View className="w-full max-w-sm items-center rounded-3xl border border-theme-border bg-theme-surface p-8">
                {error ? (
                    <>
                        <View className="mb-5 h-14 w-14 items-center justify-center rounded-full bg-theme-error/10">
                            <Text className="text-2xl text-theme-error">
                                !
                            </Text>
                        </View>

                        <Text className="mb-2 text-center text-xl font-semibold text-theme-text">
                            Sign-in unsuccessful
                        </Text>

                        <Text className="text-center leading-6 text-theme-error">
                            {error}
                        </Text>
                    </>
                ) : (
                    <>
                        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-theme-primary/10">
                            <ActivityIndicator
                                size="large"
                                color="#8f7257"
                            />
                        </View>

                        <Text className="mb-2 text-center text-xl font-semibold text-theme-text">
                            Signing you in
                        </Text>

                        <Text className="text-center leading-6 text-theme-textMuted">
                            Completing GitHub sign-in. You’ll be redirected to your workspaces shortly.
                        </Text>
                    </>
                )}
            </View>
        </View>
    );
}
