
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "@/theme/themes";

interface JoinWorkspaceModalProps {
    visible: boolean;
    colours: ThemeColors;
    onClose: () => void;
    onCreate: () => void;
    onJoin: (code: string) => Promise<void>;
}


const INVITATION_CODE_REGEX = /^[A-Za-z0-9_-]{43}$/;

function extractInvitationCode(value: string): string | null {
    const input = value.trim();

    if (INVITATION_CODE_REGEX.test(input)) {
        return input;
    }

    const match = input.match(
        /^https?:\/\/[^\s/]+(?:\/[^?#]*)?\/join\/([A-Za-z0-9_-]{43})\/?(?:[?#].*)?$/i
    );

    return match?.[1] ?? null;
}

export default function JoinWorkspaceModal({
                                               visible,
                                               colours,
                                               onClose,
                                               onCreate,
                                               onJoin,
                                           }: JoinWorkspaceModalProps) {
    const [invitation, setInvitation] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setInvitation("");
            setError(null);
        }
    }, [visible]);

    const canJoin = invitation.trim().length > 0 && !isJoining;

    const handleJoin = async () => {
        if (!canJoin) return;

        const code = extractInvitationCode(invitation);

        if (!code) {
            setError(
                "Please enter a valid invitation code or invitation link."
            );
            return;
        }

        try {
            setIsJoining(true);
            setError(null);

            await onJoin(code);

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to join this workspace. Please try again."
            );
        } finally {
            setIsJoining(false);
        }
    };

    const handleClose = () => {
        if (!isJoining) {
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                className="flex-1 items-center justify-center bg-black/60 px-4 py-6"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View
                    className="w-full max-w-md rounded-3xl border p-6"
                    style={{
                        backgroundColor: colours.surface,
                        borderColor: colours.border,
                    }}
                >
                    {/* Header */}
                    <View className="mb-6 flex-row items-start justify-between">
                        <View
                            className="h-14 w-14 items-center justify-center rounded-2xl"
                            style={{
                                backgroundColor: colours.primary,
                            }}
                        >
                            <Ionicons
                                name="people-outline"
                                size={27}
                                color={colours.textLight}
                            />
                        </View>

                        <Pressable
                            accessibilityLabel="Close join workspace"
                            className="rounded-xl p-2"
                            onPress={handleClose}
                            disabled={isJoining}
                        >
                            <Ionicons
                                name="close"
                                size={23}
                                color={colours.textMuted}
                            />
                        </Pressable>
                    </View>

                    <Text
                        className="mb-2 text-2xl font-bold"
                        style={{ color: colours.text }}
                    >
                        Join a workspace
                    </Text>

                    <Text
                        className="mb-6 text-sm leading-6"
                        style={{ color: colours.textMuted }}
                    >
                        Been invited to collaborate? Enter the
                        invitation code or link shared by your teammate
                        to become part of their workspace.
                    </Text>

                    <Text
                        className="mb-2 text-sm font-semibold"
                        style={{ color: colours.text }}
                    >
                        Invitation code or link
                    </Text>

                    <View
                        className="flex-row items-center rounded-xl border px-4"
                        style={{
                            backgroundColor: colours.surfaceLight,
                            borderColor: error
                                ? colours.error
                                : colours.border,
                        }}
                    >
                        <Ionicons
                            name="link-outline"
                            size={19}
                            color={colours.textMuted}
                        />

                        <TextInput
                            testID="workspace-invitation-input"
                            className="min-w-0 flex-1 py-4 pl-3 text-sm"
                            value={invitation}
                            onChangeText={(value) => {
                                setInvitation(value);
                                setError(null);
                            }}
                            placeholder="Paste invitation link or code"
                            placeholderTextColor={colours.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isJoining}
                            returnKeyType="go"
                            onSubmitEditing={() => void handleJoin()}
                            style={{ color: colours.text }}
                        />
                    </View>

                    {error && (
                        <View
                            className="mt-4 flex-row items-start gap-2 rounded-xl border p-3"
                            style={{
                                borderColor: colours.error,
                                backgroundColor: colours.surfaceLight,
                            }}
                        >
                            <Ionicons
                                name="alert-circle-outline"
                                size={19}
                                color={colours.error}
                            />

                            <Text
                                className="min-w-0 flex-1 text-sm leading-5"
                                style={{ color: colours.error }}
                            >
                                {error}
                            </Text>
                        </View>
                    )}

                    <View
                        className="mt-5 flex-row items-start gap-3 rounded-xl p-4"
                        style={{
                            backgroundColor: colours.surfaceLight,
                        }}
                    >
                        <Ionicons
                            name="information-circle-outline"
                            size={20}
                            color={colours.accent}
                        />

                        <Text
                            className="min-w-0 flex-1 text-xs leading-5"
                            style={{ color: colours.textMuted }}
                        >
                            Once you join, you'll become a Member of
                            the workspace. You can collaborate on
                            boards, manage tasks and work with
                            your teammates.
                        </Text>
                    </View>

                    <Pressable
                        testID="join-workspace-submit"
                        onPress={() => void handleJoin()}
                        disabled={!canJoin}
                        className={`mt-6 flex-row items-center justify-center gap-2 rounded-xl py-4 ${
                            canJoin ? "active:opacity-80" : "opacity-50"
                        }`}
                        style={{
                            backgroundColor: colours.primary,
                        }}
                    >
                        {isJoining ? (
                            <ActivityIndicator
                                size="small"
                                color={colours.textLight}
                            />
                        ) : (
                            <Ionicons
                                name="enter-outline"
                                size={20}
                                color={colours.textLight}
                            />
                        )}

                        <Text
                            className="text-base font-bold"
                            style={{ color: colours.textLight }}
                        >
                            {isJoining
                                ? "Joining workspace..."
                                : "Join workspace"}
                        </Text>
                    </Pressable>

                    <View className="my-5 flex-row items-center gap-3">
                        <View
                            className="h-px flex-1"
                            style={{
                                backgroundColor: colours.border,
                            }}
                        />

                        <Text
                            className="text-xs"
                            style={{ color: colours.textMuted }}
                        >
                            OR
                        </Text>

                        <View
                            className="h-px flex-1"
                            style={{
                                backgroundColor: colours.border,
                            }}
                        />
                    </View>

                    <Pressable
                        onPress={onCreate}
                        disabled={isJoining}
                        className="items-center rounded-xl border py-4 active:opacity-80"
                        style={{
                            borderColor: colours.border,
                            opacity: isJoining ? 0.5 : 1,
                        }}
                    >
                        <Text
                            className="font-semibold"
                            style={{ color: colours.primary }}
                        >
                            Create your own workspace
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
