import { useState } from "react";
import {
    KeyboardAvoidingView, Platform, Pressable, ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { router } from "expo-router";

import { registerClient as registerApi } from "../../api/apiClient";
import {useAuth} from "@/context/AuthContext";

export default function RegisterScreen() {
    const {login} = useAuth();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [usernameFocus, setUsernameFocus] = useState(false);

    const passwordLengthValid =
        password.length >= 8 && password.length <= 48;

    const usernameLengthValid = username.length >= 5 && username.length < 50

    const passwordUppercaseValid = /[A-Z]/.test(password);

    const passwordNumberValid = /\d/.test(password);

    const passwordsMatch =
        password.length > 0 &&
        password === confirmPassword;

    const emailValid =
        email.length > 0 && email.includes("@");

    const formValid =
        username.length > 0 &&
        firstName.length > 0 &&
        emailValid &&
        passwordLengthValid &&
        passwordUppercaseValid &&
        passwordNumberValid &&
        passwordsMatch;

    const handleRegister = async () => {
        setError("");

        if (!formValid) {
            switch (true) {
                case username.length === 0:
                    setError("Please enter a username.");
                    break;

                case !usernameLengthValid:
                    setError("Username must be between 5 and 48 characters.");
                    break;

                case firstName.length === 0:
                    setError("Please enter your first name.");
                    break;

                case !emailValid:
                    setError("Please enter a valid email address.");
                    break;

                case !passwordLengthValid:
                    setError("Password must be between 8 and 64 characters.");
                    break;

                case !passwordUppercaseValid:
                    setError("Password must contain at least one uppercase letter.");
                    break;

                case !passwordNumberValid:
                    setError("Password must contain at least one number.");
                    break;

                case !passwordsMatch:
                    setError("Passwords do not match.");
                    break;
            }
            return;
        }

        try {
            setIsLoading(true);

            const response = await registerApi(
                username,
                firstName,
                lastName,
                email,
                password
            );


            router.replace({
                pathname: "/(auth)/confirm-email",
                params: {
                    email: response.email,
                },
            });
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError(
                    "Something went wrong while creating your account."
                );
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const goToLogin = () => {
      router.replace({
          pathname: "/(auth)/login",
      })
    }

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
                        className="w-full max-w-[480px] rounded-3xl border border-theme-border bg-theme-surfaceLight p-8 shadow-2xl">
                        
                        <View className="mb-8 items-center">
                            <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-theme-primary">
                                <Text className="text-2xl font-bold text-theme-textLight">
                                    K
                                </Text>
                            </View>

                            <Text className="text-center text-3xl font-bold tracking-tight text-theme-primaryDark">
                                Create an account
                            </Text>

                            <Text className="mt-2 text-center text-base text-theme-textMuted">
                                Set up your account and create your first workspace.
                            </Text>
                        </View>
                        
                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            Username
                        </Text>

                        <TextInput
                            className="mb-3 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="Username"
                            placeholderTextColor="#a08361"
                            value={username}
                            onFocus={() => setUsernameFocus(true)}
                            onBlur={() => setUsernameFocus(false)}
                            onChangeText={(text) => {
                                setUsername(text);
                                setError("");
                            }}
                            autoCapitalize="none"
                        />

                        {usernameFocus && (
                            <View className="mb-4">
                                <Text
                                    className={
                                        usernameLengthValid
                                            ? "mb-1 text-sm text-theme-success"
                                            : "mb-1 text-sm text-theme-error"
                                    }
                                >
                                    ● 5-48 characters
                                </Text>
                            </View>
                        )}
                        
                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            First Name
                        </Text>

                        <TextInput
                            className="mb-5 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="First Name"
                            placeholderTextColor="#a08361"
                            value={firstName}
                            onChangeText={(text) => {
                                setFirstName(text);
                                setError("");
                            }}
                            autoCapitalize="words"
                        />
                        
                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            Last Name
                        </Text>

                        <TextInput
                            className="mb-5 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="Last Name"
                            placeholderTextColor="#a08361"
                            value={lastName}
                            onChangeText={(text) => {
                                setLastName(text);
                                setError("");
                            }}
                            autoCapitalize="words"
                        />
                        
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
                            keyboardType="email-address"
                        />
                        
                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            Password
                        </Text>

                        <TextInput
                            className="mb-3 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="Password"
                            placeholderTextColor="#a08361"
                            value={password}
                            onFocus={() => setPasswordFocused(true)}
                            onChangeText={(text) => {
                                setPassword(text);
                                setError("");
                            }}
                            secureTextEntry
                        />

                        {passwordFocused && (
                            <View className="mb-4">
                                <Text
                                    className={
                                        passwordLengthValid
                                            ? "mb-1 text-sm text-theme-success"
                                            : "mb-1 text-sm text-theme-error"
                                    }
                                >
                                    ● 8–64 characters
                                </Text>

                                <Text
                                    className={
                                        passwordUppercaseValid
                                            ? "mb-1 text-sm text-theme-success"
                                            : "mb-1 text-sm text-theme-error"
                                    }
                                >
                                    ● At least one uppercase letter
                                </Text>

                                <Text
                                    className={
                                        passwordNumberValid
                                            ? "mb-1 text-sm text-theme-success"
                                            : "mb-1 text-sm text-theme-error"
                                    }
                                >
                                    ● At least one number
                                </Text>

                                <Text
                                    className={
                                        passwordsMatch
                                            ? "mb-1 text-sm text-theme-success"
                                            : "mb-1 text-sm text-theme-error"
                                    }
                                >
                                    ● Passwords match
                                </Text>
                            </View>
                        )}
                        
                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            Confirm Password
                        </Text>

                        <TextInput
                            className="mb-5 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="Confirm password"
                            placeholderTextColor="#a08361"
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                setError("");
                            }}
                            secureTextEntry
                        />
                        
                        {error !== "" && (
                            <View className="mb-5 rounded-xl border border-[#d5aaa3] bg-[#f5dfdb] px-4 py-3">
                                <Text className="text-sm font-medium text-theme-error">
                                    {error}
                                </Text>
                            </View>
                        )}
                        
                        <Pressable
                            onPress={handleRegister}
                            disabled={isLoading}
                            className="rounded-xl bg-theme-primary px-5 py-4"
                        >
                            <Text className="text-center font-bold text-theme-textLight">
                                {isLoading ? "Creating account..." : "Register"}
                            </Text>
                        </Pressable>


                        <View className="mt-6 flex-row justify-center">
                            <Text className="text-sm text-theme-textMuted">
                                Already have an account?{" "}
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
        </KeyboardAvoidingView>
    );
}    

