import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Button, Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { confirmEmail } from "@/client/api/apiClient";
import { useAuth} from "@/context/AuthContext";
// @ts-ignore
import CreateProfile from "../../components/profile/CreateProfile";

export default function EmailConfirmedScreen() {
    const { login } = useAuth();

    const { userId, token } = useLocalSearchParams<{
        userId: string;
        token: string;
    }>();

    const [error, setError] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [showCreateProfile, setShowCreateProfile] = useState(false);

    const skipProfileCreation = () => {
        router.replace("/(dashboard)/workspaces")
    }

    useEffect(() => {
        const confirm = async () => {
            if (!userId || !token) {
                setError("Invalid confirmation link.");
                return;
            }

            try {
                const response = await confirmEmail(
                    Number(userId),
                    token
                );

                login(response.token, {
                    id: Number(response.userId),
                    username: response.username,
                    firstName: response.firstName,
                    lastName: response.lastName || null,
                    email: response.email
                });

                setConfirmed(true);
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError(
                        "Something went wrong while confirming your email."
                    );
                }
            }
        };

        confirm();
    }, [userId, token]);

    if (!confirmed && !error) {
        return (
            <View className="flex-1 items-center justify-center bg-theme-background px-6">
                <View className="w-full max-w-md items-center rounded-2xl border border-theme-border bg-theme-surfaceLight p-8">
                    <ActivityIndicator
                        size="large"
                        color="#5c4633"
                    />

                    <Text className="mt-5 text-center text-base text-theme-text">
                        Confirming your email...
                    </Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 items-center justify-center bg-theme-background px-6">
                <View className="w-full max-w-lg rounded-2xl border border-theme-border bg-theme-surfaceLight p-8">
                    <Text className="text-center text-3xl font-bold text-theme-text">
                        Email confirmation failed
                    </Text>

                    <Text className="mt-4 text-center text-base leading-6 text-theme-textMuted">
                        {error}
                    </Text>

                    <Pressable
                        onPress={() => router.replace("/(auth)/login")}
                        className="mt-7 min-h-12 items-center justify-center rounded-xl bg-theme-primary px-5"
                    >
                        <Text className="font-bold text-theme-textLight">
                            Back to login
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 items-center justify-center bg-theme-background px-6">
            <View className="w-full max-w-lg rounded-2xl border border-theme-border bg-theme-surfaceLight p-8">
                <View className="items-center">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-theme-success">
                        <Text className="text-2xl font-bold text-theme-textLight">
                            ✓
                        </Text>
                    </View>

                    <Text className="mt-6 text-center text-3xl font-bold text-theme-text">
                        Your email has been confirmed
                    </Text>

                    <Text className="mt-4 text-center text-base leading-6 text-theme-textMuted">
                        Your account is ready. You can set up your profile
                        now, or skip this step and do it later.
                    </Text>
                </View>

                <View className="mt-8">
                    <Pressable
                        onPress={() => setShowCreateProfile(true)}
                        className="min-h-12 items-center justify-center rounded-xl bg-theme-primary px-5"
                    >
                        <Text className="font-bold text-theme-textLight">
                            Set up profile
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={skipProfileCreation}
                        className="mt-2 min-h-12 items-center justify-center rounded-xl px-5"
                    >
                        <Text className="font-semibold text-theme-textMuted">
                            Skip for now
                        </Text>
                    </Pressable>
                </View>
            </View>

            {showCreateProfile && (
                <CreateProfile
                    onComplete={() => {
                        setShowCreateProfile(false);
                        router.replace("/(dashboard)/workspaces");
                    }}
                    onSkip={() => {
                        setShowCreateProfile(false);
                        skipProfileCreation();
                    }}
                />
            )}
        </View>
    );
}