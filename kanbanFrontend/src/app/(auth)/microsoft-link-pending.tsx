
import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";

export default function MicrosoftLinkPending() {
    return (
        <View className="flex-1 items-center justify-center bg-theme-background p-6">
            <View className="w-full max-w-sm items-center rounded-3xl border border-theme-border bg-theme-surface p-8">
                <View className="mb-5 h-14 w-14 items-center justify-center rounded-full bg-theme-primary/10">
                    <Text className="text-2xl text-theme-primary">
                        @
                    </Text>
                </View>

                <Text className="mb-2 text-center text-xl font-semibold text-theme-text">
                    Check your email
                </Text>

                <Text className="mb-6 text-center leading-6 text-theme-textMuted">
                    We found an existing Kanban account with this email
                    address. To link your Microsoft account, open the
                    confirmation link sent to your Kanban email address.
                </Text>

                <Pressable
                    onPress={() => router.replace("/(auth)/login")}
                    style={({ pressed }) => [
                        { opacity: pressed ? 0.8 : 1 },
                    ]}
                    className="w-full items-center rounded-xl bg-theme-primary px-5 py-3"
                >
                    <Text className="font-medium text-white">
                        Return to sign in
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}
