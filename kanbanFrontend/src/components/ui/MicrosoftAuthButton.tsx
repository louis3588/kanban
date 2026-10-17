
import { useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import { SvgUri } from "react-native-svg";
import { microsoftLoginUrl } from "@/client/api/apiClient";

type MicrosoftAuthButtonProps = {
    isLogin: boolean;
    isLoading?: boolean;
    setError: (message: string) => void;
};

export default function MicrosoftAuthButton({
                                                isLogin,
                                                isLoading = false,
                                                setError,
                                            }: MicrosoftAuthButtonProps) {
    const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

    const handleMicrosoftLogin = async () => {
        setIsMicrosoftLoading(true);
        setError("");

        try {
            const url =
                Platform.OS === "web"
                    ? `${microsoftLoginUrl}?platform=web`
                    : microsoftLoginUrl;

            if (Platform.OS === "web") {
                window.location.href = url;
            } else {
                await Linking.openURL(url);
            }
        } catch {
            setError("Unable to open Microsoft sign-in. Please try again.");
            setIsMicrosoftLoading(false);
        }
    };

    return (
        <>
            <Pressable
                onPress={handleMicrosoftLogin}
                disabled={isLoading || isMicrosoftLoading}
                style={({ pressed }) => [
                    { opacity: pressed ? 0.8 : 1 },
                ]}
                className="mb-5 w-[100%] flex-row items-center justify-center rounded-xl border border-theme-border bg-theme-surface px-[5%] py-4 shadow-sm"
            >
                {isMicrosoftLoading ? (
                    <ActivityIndicator
                        size="small"
                        className="py-0.5"
                    />
                ) : (
                    <View className="w-[100%] flex-row items-center justify-center">
                        <SvgUri
                            uri="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                            style={{
                                width: "8%",
                                height: "auto",
                                aspectRatio: 1,
                            }}
                            className="mr-[4%]"
                        />

                        <Text className="text-center font-medium text-theme-text text-base">
                            {isLogin
                                ? "Continue with Microsoft"
                                : "Register with Microsoft"}
                        </Text>
                    </View>
                )}
            </Pressable>
        </>
    );
}
