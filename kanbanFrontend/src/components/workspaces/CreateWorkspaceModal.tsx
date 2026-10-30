
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "@/theme/themes";

interface CreateWorkspaceModalProps {
    visible: boolean;
    isFirstWorkspace: boolean;
    colours: ThemeColors;
    onClose: () => void;
    onJoin: () => void;
    onCreate: (name: string) => Promise<void>;
}

export default function CreateWorkspaceModal({
                                                 visible,
                                                 isFirstWorkspace,
                                                 colours,
                                                 onClose,
                                                 onJoin,
                                                 onCreate,
                                             }: CreateWorkspaceModalProps) {
    const [name, setName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setName("");
            setError(null);
        }
    }, [visible]);

    const trimmedName = name.trim();
    const trimmedNameUrl = trimmedName + "/";
    const canCreate = trimmedName.length > 0 && !isSaving;
    const linkUrl = `https://kanban-d6zv.onrender.com/join/${encodeURIComponent(trimmedNameUrl)}INVITE-CODE`

    const handleCreate = async () => {
        if (!canCreate) return;

        try {
            setIsSaving(true);
            setError(null);

            await onCreate(trimmedName);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to create workspace."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                if (!isSaving) onClose();
            }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1 items-center justify-center bg-black/60 px-4 py-6"
            >
                <View
                    className="w-full max-w-lg overflow-hidden rounded-3xl border"
                    style={{
                        backgroundColor: colours.surface,
                        borderColor: colours.border,
                        maxHeight: "95%",
                    }}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerClassName="p-6"
                    >
                        <View className="mb-6 flex-row items-start justify-between">
                            <View
                                className="h-14 w-14 items-center justify-center rounded-2xl"
                                style={{
                                    backgroundColor: colours.primary,
                                }}
                            >
                                <Ionicons
                                    name="layers-outline"
                                    size={28}
                                    color={colours.textLight}
                                />
                            </View>

                            <Pressable
                                accessibilityLabel="Close create workspace"
                                className="rounded-xl p-2"
                                onPress={onClose}
                                disabled={isSaving}
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
                            {isFirstWorkspace
                                ? "Your first workspace"
                                : "Create a workspace"}
                        </Text>

                        <Text
                            className="mb-7 text-sm leading-6"
                            style={{ color: colours.textMuted }}
                        >
                            {isFirstWorkspace
                                ? "A workspace brings your projects, boards and teammates together. Create your own space to organise tasks and collaborate in real time."
                                : "Give your new workspace a name. You can create boards and invite teammates once it's ready."}
                        </Text>

                        <Text
                            className="mb-2 text-sm font-semibold"
                            style={{ color: colours.text }}
                        >
                            Workspace name
                        </Text>

                        <TextInput
                            testID="workspace-name-input"
                            className="w-full rounded-xl border px-4 py-4 text-base"
                            style={{
                                backgroundColor: colours.surfaceLight,
                                borderColor: error
                                    ? colours.error
                                    : colours.border,
                                color: colours.text,
                            }}
                            placeholder="e.g. Development team"
                            placeholderTextColor={colours.textMuted}
                            value={name}
                            onChangeText={setName}
                            editable={!isSaving}
                            maxLength={100}
                            autoCapitalize="sentences"
                            returnKeyType="done"
                            onSubmitEditing={() => void handleCreate()}
                        />

                        <Text
                            className="mt-2 text-right text-xs"
                            style={{ color: colours.textMuted }}
                        >
                            {name.length}/100 characters
                        </Text>

                        <View
                            className="mt-6 rounded-2xl border p-4"
                            style={{
                                backgroundColor: colours.surfaceLight,
                                borderColor: colours.border,
                            }}
                        >
                            <View className="mb-3 flex-row items-center gap-2">
                                <Ionicons
                                    name="link-outline"
                                    size={19}
                                    color={colours.primary}
                                />
                                <Text
                                    className="text-sm font-semibold"
                                    style={{ color: colours.text }}
                                >
                                    Your future invitation link
                                </Text>
                            </View>

                            <View
                                className="rounded-lg border px-3 py-3"
                                style={{
                                    backgroundColor: colours.surface,
                                    borderColor: colours.border,
                                }}
                            >
                                <Text
                                    className="text-xs"
                                    selectable
                                    style={{ color: colours.primary }}
                                >
                                    {linkUrl}
                                </Text>
                            </View>

                            <Text
                                className="mt-3 text-xs leading-5"
                                style={{ color: colours.textMuted }}
                            >
                                Preview only. Your actual invitation
                                link will be generated when we add
                                workspace invitations.
                            </Text>
                        </View>

                        {error && (
                            <View
                                className="mt-4 rounded-xl border p-3"
                                style={{
                                    borderColor: colours.error,
                                }}
                            >
                                <Text
                                    className="text-sm"
                                    style={{ color: colours.error }}
                                >
                                    {error}
                                </Text>
                            </View>
                        )}

                        <Pressable
                            testID="create-workspace-submit"
                            className="mt-6 flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
                            style={{
                                backgroundColor: colours.primary,
                                opacity: canCreate ? 1 : 0.5,
                            }}
                            disabled={!canCreate}
                            onPress={() => void handleCreate()}
                        >
                            {isSaving ? (
                                <ActivityIndicator
                                    color={colours.textLight}
                                />
                            ) : (
                                <Ionicons
                                    name="add-circle-outline"
                                    size={20}
                                    color={colours.textLight}
                                />
                            )}

                            <Text
                                className="text-base font-bold"
                                style={{ color: colours.textLight }}
                            >
                                {isSaving
                                    ? "Creating..."
                                    : "Create workspace"}
                            </Text>
                        </Pressable>

                        {isFirstWorkspace && (
                            <>
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
                                    className="items-center rounded-xl border p-4"
                                    style={{
                                        borderColor: colours.border,
                                    }}
                                    disabled={isSaving}
                                    onPress={onJoin}
                                >
                                    <Text
                                        className="font-semibold"
                                        style={{ color: colours.primary }}
                                    >
                                        Join an existing workspace
                                    </Text>
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
