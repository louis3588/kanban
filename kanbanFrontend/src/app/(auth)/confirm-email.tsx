import { Text, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function ConfirmEmailScreen() {
    const { email } = useLocalSearchParams<{
        email: string;
    }>();

    return (
        <View className="flex-1 items-center justify-center bg-theme-background px-6">
            <View className="w-full max-w-lg rounded-2xl border border-theme-border bg-theme-surfaceLight p-8">
                <View className="items-center">
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-theme-accent">
                        <Text className="text-2xl text-theme-textLight">
                            ✉
                        </Text>
                    </View>

                    <Text className="mt-6 text-center text-3xl font-bold text-theme-text">
                        Check your email
                    </Text>

                    <Text className="mt-4 text-center text-base leading-6 text-theme-textMuted">
                        We've sent a confirmation link to:
                    </Text>

                    <View className="mt-3 rounded-xl border border-theme-border bg-theme-surface px-4 py-3">
                        <Text className="text-center text-base font-bold text-theme-text">
                            {email}
                        </Text>
                    </View>

                    <Text className="mt-4 text-center text-base leading-6 text-theme-textMuted">
                        Click the link in the email to confirm your account.
                    </Text>
                </View>

                <Pressable
                    onPress={() => router.replace("/(auth)/login")}
                    className="mt-8 min-h-12 items-center justify-center rounded-xl bg-theme-primary px-5"
                >
                    <Text className="font-bold text-theme-textLight">
                        Back to login
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
