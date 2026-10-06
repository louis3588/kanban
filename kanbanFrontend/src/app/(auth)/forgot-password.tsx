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
import {router} from "expo-router";

import Alert from "@/components/Alert";
import {passwordResetApi} from "@/client/api/apiClient";
import {Image} from "expo-image";

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showAlert, setShowAlert] = useState(false);

    const emailValid =
        email.trim().length > 0 &&
        email.includes("@");

    const handlePasswordReset = async () => {
        setError("");

        if (!emailValid) {
            setError("Please enter a valid email address.");
            return;
        }

        try {
            setIsLoading(true);

            await passwordResetApi(email.trim());

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
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={{flexGrow: 1}}
                keyboardShouldPersistTaps="handled"
                className="flex-1"
            >
                <View className="flex-1 items-center justify-center px-6 py-12">
                    <View
                        className="w-full max-w-[480px] rounded-3xl border border-theme-border bg-theme-surfaceLight p-8 shadow-2xl"
                    >
                        <View className="mb-8 items-center">
                            <Image source={{ uri: "https://res.cloudinary.com/dm7vciols/image/upload/v1791052476/app-header_ufbjml.png"}}
                                   style={{width: 200, height: 80}}/>

                            <Text className="text-center text-3xl font-bold tracking-tight text-theme-primaryDark">
                                Forgot your password?
                            </Text>

                            <Text className="mt-2 text-center text-base leading-6 text-theme-textMuted">
                                Enter the email address associated with your
                                account and we’ll send you a link to reset
                                your password.
                            </Text>
                        </View>

                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            Email
                        </Text>

                        <TextInput
                            className="mb-5 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="Email"
                            placeholderTextColor="#a08361"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setError("");
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            textContentType="emailAddress"
                        />

                        {error !== "" && (
                            <View className="mb-5 rounded-xl border border-[#d5aaa3] bg-[#f5dfdb] px-4 py-3">
                                <Text className="text-sm font-medium text-theme-error">
                                    {error}
                                </Text>
                            </View>
                        )}

                        <Pressable
                            onPress={handlePasswordReset}
                            disabled={isLoading}
                            className="rounded-xl bg-theme-primary px-5 py-4"
                        >
                            <Text className="text-center font-bold text-theme-textLight">
                                {isLoading
                                    ? "Sending email..."
                                    : "Send reset email"}
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
                title="Check your email"
                message="If an account exists with that email address, we’ve sent you a password reset link. Please check your inbox and follow the instructions."
                buttonText="Back to login"
                onClose={closeAlert}
            />
        </KeyboardAvoidingView>
    );
}