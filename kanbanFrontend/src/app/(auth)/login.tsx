// noinspection TypeScriptValidateTypes

import {
    View,
    Text,
    TextInput,
    Pressable,
    Platform,
    ScrollView,
    KeyboardAvoidingView, ActivityIndicator
} from "react-native";
import {useAuth} from "@/context/AuthContext";
import {useState} from "react";
import {loginClient, googleLoginUrl, googleLoginClient} from "@/client/api/apiClient";
import {router} from "expo-router";
import {Image} from "expo-image";
import GoogleAuthButton from "@/components/ui/GoogleAuthButton";
import GitHubAuthButton from "@/components/ui/GitHubAuthButton";

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
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center",
                    padding: 24
                }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="w-full max-w-[1100px] self-center overflow-hidden rounded-3xl border border-theme-border bg-theme-surfaceLight shadow-2xl">
                    <View className="flex-row flex-wrap">

                        <View className="w-full border-b border-theme-border bg-theme-surface p-6 md:w-[30%] md:border-b-0 md:border-r">
                            <View className="mb-8 items-center">
                                <Image
                                    source={{
                                        uri: "https://res.cloudinary.com/dm7vciols/image/upload/v1791052476/app-header_ufbjml.png"
                                    }}
                                    style={{
                                        width: 180,
                                        height: 72
                                    }}
                                    resizeMode="contain"
                                />

                                <Text className="mt-5 text-center text-xl font-bold text-theme-primaryDark">
                                    Welcome back
                                </Text>

                                <Text className="mt-2 text-center text-sm text-theme-textMuted">
                                    Sign in with your preferred account.
                                </Text>
                            </View>

                            <GoogleAuthButton
                                isLogin={true}
                                onError={setError}
                            />

                            <GitHubAuthButton
                                isLogin={true}
                                onError={setError}
                            />

                        </View>

                        {/* Right: email and password login */}
                        <View className="w-full p-6 sm:p-8 md:w-[70%] md:p-10">
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
                                className="mb-3 rounded-xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text"
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

                            <View className="mt-6 flex-row flex-wrap justify-center">
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
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}