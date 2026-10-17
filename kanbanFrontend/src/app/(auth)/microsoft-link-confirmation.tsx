import {router, useLocalSearchParams} from "expo-router";
import {useAuth} from "@/context/AuthContext";
import {useState} from "react";
import {confirmMicrosoftLink} from "@/client/api/apiClient";
import {ActivityIndicator, Pressable, Text, View} from "react-native";


export default function MicrosoftLinkConfirmation(){
    const { token } = useLocalSearchParams<{ token: string }>()
    const { login } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleConfirmation = async () => {
        if(!token || isLoading) {
            if(!token){
                setError("The confirmation link is missing its token")
            }
            return;
        }
        setIsLoading(true);
        setError("");

        try{
            const response = await confirmMicrosoftLink(token)
            login(response.token, {
                id: Number.parseInt(response.userId),
                username: response.username,
                firstName: response.firstName,
                lastName: response.lastName,
                email: response.email,
            });

            router.replace("/(dashboard)/workspaces");
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Unable to confirm the microsoft account link"
            );
            setIsLoading(false);
        }
    }

    return (
        <View className="flex-1 items-center justify-center bg-theme-background p-6">
            <View className="w-full max-w-sm items-center rounded-3xl border border-theme-border bg-theme-surface p-8">
                <View className="mb-5 h-14 w-14 items-center justify-center rounded-full bg-theme-primary/10">
                    <Text className="text-2xl text-theme-primary">
                        {error ? "!" : "✓"}
                    </Text>
                </View>

                <Text className="mb-2 text-center text-xl font-semibold text-theme-text">
                    Confirm Microsoft account link
                </Text>

                <Text className="mb-6 text-center leading-6 text-theme-textMuted">
                    Confirm that you want to link your Microsoft account to
                    your existing Kanban account. Once linked, you can use
                    Microsoft to sign in to Kanban.
                </Text>

                {error ? (
                    <Text className="mb-5 text-center leading-6 text-theme-error">
                        {error}
                    </Text>
                ) : null}

                <Pressable
                    onPress={handleConfirmation}
                    disabled={isLoading || !token}
                    style={({ pressed }) => [
                        {
                            opacity:
                                pressed || isLoading || !token ? 0.7 : 1,
                        },
                    ]}
                    className="w-full flex-row items-center justify-center rounded-xl bg-theme-primary px-5 py-3"
                >
                    {isLoading ? (
                        <ActivityIndicator
                            size="small"
                            color="#ffffff"
                        />
                    ) : (
                        <Text className="font-medium text-white">
                            Confirm and link account
                        </Text>
                    )}
                </Pressable>

                <Pressable
                    onPress={() => router.replace("/(auth)/login")}
                    disabled={isLoading}
                    className="mt-5 px-3 py-2"
                >
                    <Text className="text-center font-medium text-theme-textMuted">
                        Cancel and return to sign in
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}