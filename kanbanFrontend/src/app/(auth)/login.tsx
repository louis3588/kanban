// noinspection TypeScriptValidateTypes

import {
    View,
    Text,
    TextInput,
    Pressable,
    Platform,
    ScrollView,
    KeyboardAvoidingView
} from "react-native";
import {useAuth} from "@/context/AuthContext";
import {useState} from "react";
import {loginClient} from "@/client/api/apiClient";
import {router} from "expo-router";
import {Image} from "expo-image";
import {width} from "@expo/ui/jetpack-compose/modifiers";

export default function Login() {
    const {login} = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const goToRegister = () => {
        router.replace("/(auth)/register")
    }

    const goToForgotPassword = () => {
        router.replace({
            pathname: "/(auth)/forgot-password",
        });
    };

    const handleLogin = async () => {
        setError("")

        if (!username || !password) {
            setError("Please enter your username and password");
            return;
        }

        try {
            setIsLoading(true);

            const response = await loginClient(username, password);
            login(response.token, {
                id: Number.parseInt(response.userId),
                username: response.username,
                firstName: response.firstName,
                lastName: response.lastName || null,
                email: response.email
            });

            router.replace("/(dashboard)/workspaces")
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message)
            } else {
                setError("Something went wrong while logging in")
            }
        } finally {
            setIsLoading(false)
        }

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
                            <View className="flex-row items-center justify-between rounded-2xl border border-[#bda78f] bg-theme-accent px-6 py-1">
                                <Image source={{ uri: "https://res.cloudinary.com/dm7vciols/image/upload/v1791052476/app-header_ufbjml.png"}}
                                       style={{width: 200, height: 80}}/>
                            </View>

                            <Text className="text-center text-3xl font-bold tracking-tight text-theme-primaryDark">
                                Welcome back
                            </Text>

                            <Text className="mt-2 text-center text-base text-theme-textMuted">
                                Log in to continue to your workspace.
                            </Text>
                        </View>

                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            Email/Username
                        </Text>

                        <TextInput
                            className="mb-5 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="Email or Username"
                            placeholderTextColor="#a08361"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />

                        <Text className="mb-2 text-sm font-bold text-theme-text">
                            Password
                        </Text>

                        <TextInput
                            className="mb-5 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
                            placeholder="Password"
                            placeholderTextColor="#a08361"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <View className="mb-5 items-end">
                            <Pressable onPress={goToForgotPassword}>
                                <Text className="text-sm font-semibold text-theme-primary">
                                    Forgot your password?
                                </Text>
                            </Pressable>
                        </View>

                        {error !== "" && (
                            <View className="mb-5 rounded-xl border border-[#d5aaa3] bg-[#f5dfdb] px-4 py-3">
                                <Text className="text-sm font-medium text-theme-error">
                                    {error}
                                </Text>
                            </View>
                        )}

                        <Pressable
                            onPress={handleLogin}
                            disabled={isLoading}
                            className="rounded-xl bg-theme-primary px-5 py-4"
                        >
                            <Text className="text-center font-bold text-theme-textLight">
                                {isLoading ? "Logging in..." : "Login"}
                            </Text>
                        </Pressable>

                        <View className="mt-6 flex-row justify-center">
                            <Text className="text-sm text-theme-textMuted">
                                Don't have an account?{" "}
                            </Text>

                            <Pressable onPress={goToRegister}>
                                <Text className="text-sm font-bold text-theme-primary">
                                    Create one
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}