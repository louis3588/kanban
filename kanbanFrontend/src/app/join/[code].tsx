
import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    Text,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";

import {
    joinWorkspace,
} from "@/client/signalr/workspaceClient";

import {
    savePendingInviteCode,
    clearPendingInviteCode,
    isValidInviteCode,
} from "@/context/utils/pendingInvitation";
import {DEFAULT_THEME, themes} from "@/theme/themes";

type JoinStatus = "checking" | "joining" | "error";

export default function JoinWorkspaceScreen() {
    const { code } = useLocalSearchParams<{
        code: string;
    }>();

    const { token, isAuthenticated, isLoading, preferences } = useAuth();
    const theme = preferences?.theme ?? DEFAULT_THEME;
    const colours = themes[theme] ?? themes[DEFAULT_THEME]

    const [status, setStatus] =
        useState<JoinStatus>("checking");

    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const joinRequestRef = useRef<{
        key: string;
        promise: ReturnType<typeof joinWorkspace>;
    } | null>(null);

    useEffect(() => {
        if (isLoading) return;

        let active = true;

        const handleInvitation = async () => {
            if (!isValidInviteCode(code)) {
                if (active) {
                    setStatus("error");
                    setError(
                        "This invitation link is invalid."
                    );
                }
                return;
            }

            if (!isAuthenticated || !token) {
                try {
                    setStatus("checking");

                    await savePendingInviteCode(code);

                    if (active) {
                        router.replace("/(auth)/login");
                    }
                } catch (err) {
                    if (active) {
                        setStatus("error");
                        setError(
                            err instanceof Error
                                ? err.message
                                : "Could not save your invitation."
                        );
                    }
                }

                return;
            }
            
            setStatus("joining");
            setError(null);

            const requestKey = `${token}:${code}`;

            if (joinRequestRef.current?.key !== requestKey) {
                joinRequestRef.current = {
                    key: requestKey,
                    promise: joinWorkspace(token, code),
                };
            }

            try {
                const joinedWorkspace =
                    await joinRequestRef.current.promise;

                if (!active) return;

                await clearPendingInviteCode(code);

                if (!active) return;

                router.replace({
                    pathname: "/workspaces/[workspaceId]",
                    params: {
                        workspaceId: String(joinedWorkspace.id),
                    },
                });
            } catch (err) {
                if (joinRequestRef.current?.key === requestKey) {
                    joinRequestRef.current = null;
                }

                if (active) {
                    setStatus("error");
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to join this workspace."
                    );
                }
            }
        };

        void handleInvitation();

        return () => {
            active = false;
        };
    }, [
        code,
        token,
        isAuthenticated,
        isLoading,
        retryCount,
    ]);

    const handleCancel = async () => {
        if (isValidInviteCode(code)) {
            await clearPendingInviteCode(code);
        }

        router.replace("/workspaces");
    };

    const hasError = status === "error";

    return (
        <View
            className="flex-1 items-center justify-center px-5 py-10"
            style={{
                backgroundColor: colours.background,
            }}
        >
            <View
                className="w-full max-w-md items-center rounded-3xl border p-8"
                style={{
                    backgroundColor: colours.surface,
                    borderColor: colours.border,
                }}
            >
                <View
                    className="mb-6 h-20 w-20 items-center justify-center rounded-3xl"
                    style={{
                        backgroundColor: colours.primary,
                    }}
                >
                    <Ionicons
                        name={
                            hasError
                                ? "alert-circle-outline"
                                : "people-outline"
                        }
                        size={36}
                        color={colours.textLight}
                    />
                </View>

                <Text
                    className="text-center text-2xl font-extrabold"
                    style={{ color: colours.text }}
                >
                    {hasError
                        ? "Couldn't join workspace"
                        : status === "joining"
                            ? "Joining workspace"
                            : "Checking invitation"}
                </Text>

                <Text
                    className="mt-3 text-center text-sm leading-6"
                    style={{ color: colours.textMuted }}
                >
                    {hasError
                        ? error
                        : status === "joining"
                            ? "We're adding you to the workspace."
                            : "Checking your account and invitation."}
                </Text>

                {!hasError ? (
                    <ActivityIndicator
                        testID="join-workspace-loading"
                        className="mt-8"
                        size="large"
                        color={colours.primary}
                    />
                ) : (
                    <View className="mt-8 w-full gap-3">
                        {isValidInviteCode(code) && (
                            <Pressable
                                testID="retry-join-workspace"
                                onPress={() =>
                                    setRetryCount(value => value + 1)
                                }
                                className="items-center rounded-xl px-5 py-3"
                                style={{
                                    backgroundColor: colours.primary,
                                }}
                            >
                                <Text
                                    className="font-bold"
                                    style={{
                                        color: colours.textLight,
                                    }}
                                >
                                    Try again
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            testID="cancel-join-workspace"
                            onPress={() => void handleCancel()}
                            className="items-center rounded-xl border px-5 py-3"
                            style={{
                                borderColor: colours.border,
                            }}
                        >
                            <Text
                                className="font-semibold"
                                style={{
                                    color: colours.text,
                                }}
                            >
                                Back to workspaces
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </View>
    );
}
