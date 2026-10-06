import React, {useState} from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import {router, useLocalSearchParams} from "expo-router";

import Alert from "@/components/Alert";
import {resetPasswordApi} from "@/client/api/apiClient";

export default function ResetPasswordScreen() {
    const {userId, token} = useLocalSearchParams<{
        userId: string;
        token: string;
    }>();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showAlert, setShowAlert] = useState(false);

    const passwordsMatch =
        password.length > 0 &&
        confirmPassword.length > 0 &&
        password === confirmPassword;

    const handleResetPassword = async () => {
        setError("");

        if (!userId || !token) {
            setError("This password reset link is invalid.");
            return;
        }

        if (password.length === 0) {
            setError("Please enter a new password.");
            return;
        }

        if (confirmPassword.length === 0) {
            setError("Please confirm your new password.");
            return;
        }

        if (password !== confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        try {
            setIsLoading(true);

            await resetPasswordApi(
                Number(userId),
                password
            );

            setShowAlert(true);
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError(
                    "Something went wrong. Please try again."
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const goToLogin = () => {
        router.replace({
            pathname: "/(auth)/login",
        });
    };

    const closeAlert = () => {
        setShowAlert(false);
        goToLogin();
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-theme-background"
            behavior={
                Platform.OS === "ios"
                    ? "padding"
                    : "height"
            }
        >
            <ScrollView
                contentContainerStyle={{flexGrow: 1}}
                keyboardShouldPersistTaps="handled"
                className="flex-1"
            >
                <View className="flex-1 items-center justify-center px-6 py-12">
                    <View className="w-full max-w-[480px] rounded-3xl border border-theme-border bg-theme-surfaceLight p-8 shadow-2xl">

                        <View className="mb-8 items-center">
                            <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-theme-primary">
                                <Text className="text-2xl font-bold text-theme-textLight">
                                    K
                                </Text>
                            </View>

                            <Text className="text-center text-3xl font-bold tracking-tight text-theme-primaryDark">
                                Reset your password
                            </Text>

                            <Text className="mt-2 text-center text-base leading-6 text-theme-textMuted">
                                Enter your new password below.
                            </Text>
                        </View>

                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            New password
                        </Text>

                        <TextInput
                            className="rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="New password"
                            placeholderTextColor="#a08361"
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setError("");
                            }}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="newPassword"
                        />

                        <Text className="mb-2 mt-5 text-sm font-bold text-theme-text">
                            Confirm password
                        </Text>

                        <TextInput
                            className={
                                confirmPassword.length === 0
                                    ? "rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                                    : passwordsMatch
                                        ? "rounded-xl border border-theme-success bg-theme-surface px-4 py-3 text-base text-theme-text"
                                        : "rounded-xl border border-theme-error bg-theme-surface px-4 py-3 text-base text-theme-text"
                            }
                            placeholder="Confirm password"
                            placeholderTextColor="#a08361"
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                setError("");
                            }}
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="newPassword"
                        />

                        {confirmPassword.length > 0 && (
                            <Text
                                className={
                                    passwordsMatch
                                        ? "mt-2 text-sm font-medium text-theme-success"
                                        : "mt-2 text-sm font-medium text-theme-error"
                                }
                            >
                                {passwordsMatch
                                    ? "Passwords match"
                                    : "Passwords do not match"}
                            </Text>
                        )}

                        {error !== "" && (
                            <View className="mt-5 rounded-xl border border-[#d5aaa3] bg-[#f5dfdb] px-4 py-3">
                                <Text className="text-sm font-medium text-theme-error">
                                    {error}
                                </Text>
                            </View>
                        )}

                        <Pressable
                            onPress={handleResetPassword}
                            disabled={isLoading}
                            className={
                                isLoading
                                    ? "mt-6 rounded-xl bg-theme-borderDark px-5 py-4"
                                    : "mt-6 rounded-xl bg-theme-primary px-5 py-4"
                            }
                        >
                            <Text className="text-center font-bold text-theme-textLight">
                                {isLoading
                                    ? "Resetting password..."
                                    : "Reset password"}
                            </Text>
                        </Pressable>

                        <View className="mt-6 flex-row justify-center">
                            <Text className="text-sm text-theme-textMuted">
                                Remember your password?{" "}
                            </Text>

                            <Pressable onPress={goToLogin}>
                                <Text className="text-sm font-bold text-theme-primary">
                                    Log in
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <Alert
                visible={showAlert}
                title="Password reset"
                message="Your password has been successfully reset. You can now log in with your new password."
                buttonText="Back to login"
                onClose={closeAlert}
            />
        </KeyboardAvoidingView>
    );
}