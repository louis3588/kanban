import {AppTheme, ThemeColors} from "@/theme/themes";
import {useEffect, useState} from "react";
import {ActivityIndicator, Modal, Pressable, Text, View} from "react-native";

export interface ConfirmationAction{
    title: string;
    message: string;
    confirmationLabel: string;
    destructive?: boolean;
    onConfirm: () => Promise<void>;
    onCancel?: () => void;
}

interface Props{
    action: ConfirmationAction | null;
    onClose: () => void;
    colours: ThemeColors;
}

export default function ConfirmActionModal({
    action, onClose, colours}: Props){

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setError(null);
    }, [action]);

    const close = () => {
        if (busy) return;

        action?.onCancel?.();
        onClose();
    };

    const confirm = async () => {
        if(!action || busy) return;

        setBusy(true);
        setError(null);

        try{
            await action.onConfirm();
            onClose();
        } catch(err){
            setError(
                err instanceof Error ?
                    err.message :
                    "Unable to complete this action"
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            visible={action !== null}
            transparent
            animationType="fade"
            onRequestClose={close}
        >
            <View className="flex-1 items-center justify-center bg-black/60 px-4">
                <View
                    className="w-full max-w-md rounded-3xl border p-6"
                    style={{
                        backgroundColor: colours.surface,
                        borderColor: colours.border,
                    }}
                >
                    <Text
                        className="text-xl font-bold"
                        style={{ color: colours.text }}
                    >
                        {action?.title}
                    </Text>

                    <Text
                        className="mt-3 text-sm leading-6"
                        style={{ color: colours.textMuted }}
                    >
                        {action?.message}
                    </Text>

                    {error && (
                        <Text
                            className="mt-4 text-sm"
                            style={{ color: colours.error }}
                        >
                            {error}
                        </Text>
                    )}

                    <View className="mt-7 flex-row justify-end gap-3">
                        <Pressable
                            testID="confirmation-cancel"
                            disabled={busy}
                            onPress={close}
                            className="rounded-xl border px-5 py-3"
                            style={{
                                borderColor: colours.border,
                                opacity: busy ? 0.5 : 1,
                            }}
                        >
                            <Text style={{ color: colours.text }}>
                                Cancel
                            </Text>
                        </Pressable>

                        <Pressable
                            testID="confirmation-accept"
                            disabled={busy}
                            onPress={() => void confirm()}
                            className="flex-row items-center gap-2 rounded-xl px-5 py-3"
                            style={{
                                backgroundColor: action?.destructive
                                    ? colours.error
                                    : colours.primary,
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            {busy && (
                                <ActivityIndicator
                                    size="small"
                                    color={colours.textLight}
                                />
                            )}

                            <Text
                                className="font-bold"
                                style={{ color: colours.textLight }}
                            >
                                {action?.confirmationLabel ?? "Confirm"}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}