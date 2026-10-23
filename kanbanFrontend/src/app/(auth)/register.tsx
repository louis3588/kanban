import { useState } from "react";
import {
    KeyboardAvoidingView, Platform, Pressable, ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { router } from "expo-router";
import { registerClient as registerApi } from "@/client/api/apiClient";
import {Image} from "expo-image";
import GoogleAuthButton from "@/components/ui/externals/GoogleAuthButton";
import GitHubAuthButton from "@/components/ui/externals/GitHubAuthButton";
import MicrosoftAuthButton from "@/components/ui/externals/MicrosoftAuthButton";
import {AppTheme, themes} from "@/theme/themes";

export default function RegisterScreen() {
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

    const colours = themes[AppTheme.SepiaLight];

    const passwordLengthValid =
        password.length >= 8 && password.length <= 64;

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
            // @ts-ignore
            setError(error.message)
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
            className="flex-1"
            style={{ backgroundColor: colours.background }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center",
                    padding: 24,
                }}
                keyboardShouldPersistTaps="handled"
                className="flex-1"
            >
                <View
                    className="w-full max-w-[1100px] self-center overflow-hidden rounded-3xl border shadow-2xl"
                    style={{
                        backgroundColor: colours.surface,
                        borderColor: colours.border,
                    }}
                >
                    <View className="flex-row flex-wrap">
                        <View
                            className="w-full border-b p-6 md:w-[30%] md:border-b-0 md:border-r"
                            style={{
                                backgroundColor: colours.surface,
                                borderColor: colours.border,
                            }}
                        >
                            <View className="mb-8 items-center">
                                <Image
                                    source={{
                                        uri: "https://res.cloudinary.com/dm7vciols/image/upload/v1791052476/app-header_ufbjml.png",
                                    }}
                                    style={{ width: 180, height: 72 }}
                                    resizeMode="contain"
                                />

                                <Text
                                    className="mt-5 text-center text-xl font-bold"
                                    style={{ color: colours.primaryDark }}
                                >
                                    Join Kanban
                                </Text>

                                <Text
                                    className="mt-2 text-center text-sm"
                                    style={{ color: colours.textMuted }}
                                >
                                    Create an account using your preferred provider.
                                </Text>
                            </View>

                            <GoogleAuthButton
                                isLogin={false}
                                isLoading={isLoading}
                                onError={setError}
                            />

                            <GitHubAuthButton
                                isLogin={false}
                                isLoading={isLoading}
                                onError={setError}
                            />

                            <MicrosoftAuthButton
                                isLogin={false}
                                isLoading={isLoading}
                                setError={setError}
                            />

                            <View className="my-6 flex-row items-center">
                                <View
                                    className="h-px flex-1"
                                    style={{ backgroundColor: colours.border }}
                                />
                                <Text
                                    className="mx-3 text-xs"
                                    style={{ color: colours.textMuted }}
                                >
                                    OR REGISTER WITH EMAIL
                                </Text>
                                <View
                                    className="h-px flex-1"
                                    style={{ backgroundColor: colours.border }}
                                />
                            </View>

                            <Text
                                className="text-center text-sm"
                                style={{ color: colours.textMuted }}
                            >
                                Already have an account?{" "}
                                <Text
                                    onPress={goToLogin}
                                    className="font-bold"
                                    style={{ color: colours.primary }}
                                >
                                    Log in
                                </Text>
                            </Text>
                        </View>

                        <View className="w-full p-6 sm:p-8 md:w-[70%] md:p-10">
                            <View className="mb-8">
                                <Text
                                    className="text-3xl font-bold tracking-tight"
                                    style={{ color: colours.primaryDark }}
                                >
                                    Create an account
                                </Text>
                                <Text
                                    className="mt-2 text-sm"
                                    style={{ color: colours.textMuted }}
                                >
                                    Enter your details to get started.
                                </Text>
                            </View>

                            <Text
                                className="mb-2 text-sm font-bold"
                                style={{ color: colours.text }}
                            >
                                Username
                            </Text>

                            <TextInput
                                className="mb-3 rounded-xl border px-4 py-3 text-base"
                                style={{
                                    backgroundColor: colours.surface,
                                    borderColor: colours.border,
                                    color: colours.text,
                                }}
                                placeholder="Username"
                                placeholderTextColor={colours.textMuted}
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
                                        className="mb-1 text-sm"
                                        style={{
                                            color: usernameLengthValid
                                                ? colours.success
                                                : colours.error,
                                        }}
                                    >
                                        ● 5-48 characters
                                    </Text>
                                </View>
                            )}

                            <View className="flex-row flex-wrap">
                                <View className="w-full sm:w-1/2 sm:pr-3">
                                    <Text
                                        className="mb-2 text-sm font-bold"
                                        style={{ color: colours.text }}
                                    >
                                        First Name
                                    </Text>

                                    <TextInput
                                        className="mb-5 rounded-xl border px-4 py-3 text-base"
                                        style={{
                                            backgroundColor: colours.surface,
                                            borderColor: colours.border,
                                            color: colours.text,
                                        }}
                                        placeholder="First Name"
                                        placeholderTextColor={colours.textMuted}
                                        value={firstName}
                                        onChangeText={(text) => {
                                            setFirstName(text);
                                            setError("");
                                        }}
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View className="w-full sm:w-1/2 sm:pl-3">
                                    <Text
                                        className="mb-2 text-sm font-bold"
                                        style={{ color: colours.text }}
                                    >
                                        Last Name
                                    </Text>

                                    <TextInput
                                        className="mb-5 rounded-xl border px-4 py-3 text-base"
                                        style={{
                                            backgroundColor: colours.surface,
                                            borderColor: colours.border,
                                            color: colours.text,
                                        }}
                                        placeholder="Last Name"
                                        placeholderTextColor={colours.textMuted}
                                        value={lastName}
                                        onChangeText={(text) => {
                                            setLastName(text);
                                            setError("");
                                        }}
                                        autoCapitalize="words"
                                    />
                                </View>
                            </View>

                            <Text
                                className="mb-2 text-sm font-bold"
                                style={{ color: colours.text }}
                            >
                                Email
                            </Text>

                            <TextInput
                                className="mb-5 rounded-xl border px-4 py-3 text-base"
                                style={{
                                    backgroundColor: colours.surface,
                                    borderColor: colours.border,
                                    color: colours.text,
                                }}
                                placeholder="Email"
                                placeholderTextColor={colours.textMuted}
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setError("");
                                }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />

                            <Text
                                className="mb-2 text-sm font-bold"
                                style={{ color: colours.text }}
                            >
                                Password
                            </Text>

                            <TextInput
                                className="mb-3 rounded-xl border px-4 py-3 text-base"
                                style={{
                                    backgroundColor: colours.surface,
                                    borderColor: colours.border,
                                    color: colours.text,
                                }}
                                placeholder="Password"
                                placeholderTextColor={colours.textMuted}
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
                                        className="mb-1 text-sm"
                                        style={{
                                            color: passwordLengthValid
                                                ? colours.success
                                                : colours.error,
                                        }}
                                    >
                                        ● 8–64 characters
                                    </Text>

                                    <Text
                                        className="mb-1 text-sm"
                                        style={{
                                            color: passwordUppercaseValid
                                                ? colours.success
                                                : colours.error,
                                        }}
                                    >
                                        ● At least one uppercase letter
                                    </Text>

                                    <Text
                                        className="mb-1 text-sm"
                                        style={{
                                            color: passwordNumberValid
                                                ? colours.success
                                                : colours.error,
                                        }}
                                    >
                                        ● At least one number
                                    </Text>

                                    <Text
                                        className="mb-1 text-sm"
                                        style={{
                                            color: passwordsMatch
                                                ? colours.success
                                                : colours.error,
                                        }}
                                    >
                                        ● Passwords match
                                    </Text>
                                </View>
                            )}

                            <Text
                                className="mb-2 text-sm font-bold"
                                style={{ color: colours.text }}
                            >
                                Confirm Password
                            </Text>

                            <TextInput
                                className="mb-5 rounded-xl border px-4 py-3 text-base"
                                style={{
                                    backgroundColor: colours.surface,
                                    borderColor: colours.border,
                                    color: colours.text,
                                }}
                                placeholder="Confirm password"
                                placeholderTextColor={colours.textMuted}
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    setError("");
                                }}
                                secureTextEntry
                            />

                            {error !== "" && (
                                <View
                                    className="mb-5 rounded-xl border px-4 py-3"
                                    style={{
                                        backgroundColor: colours.surface,
                                        borderColor: colours.error,
                                    }}
                                >
                                    <Text
                                        className="text-sm font-medium"
                                        style={{ color: colours.error }}
                                    >
                                        {error}
                                    </Text>
                                </View>
                            )}

                            <Pressable
                                onPress={handleRegister}
                                disabled={isLoading}
                                className={`rounded-xl px-5 py-4 ${
            isLoading ? "opacity-60" : ""
        }`}
                                style={{ backgroundColor: colours.primary }}
                            >
                                <Text
                                    className="text-center font-bold"
                                    style={{ color: colours.textLight }}
                                >
                                    {isLoading ? "Creating account..." : "Register"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}    

