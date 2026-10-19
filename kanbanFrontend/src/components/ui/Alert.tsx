import React from "react";
import {
    Modal,
    Pressable,
    Text,
    View,
} from "react-native";

type AlertProps = {
    visible: boolean;
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
};

export default function Alert({
                                  visible,
                                  title,
                                  message,
                                  buttonText = "Continue",
                                  onClose,
                              }: AlertProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 items-center justify-center bg-black/40 px-6">
                <View className="w-full max-w-[420px] rounded-3xl border border-theme-border bg-theme-surfaceLight p-7 shadow-2xl">
                    <View className="mb-5 items-center">
                        <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-theme-primary">
                            <Text className="text-xl font-bold text-theme-textLight">
                                ✓
                            </Text>
                        </View>

                        <Text className="text-center text-2xl font-bold text-theme-primaryDark">
                            {title}
                        </Text>
                    </View>

                    <Text className="mb-6 text-center text-base leading-6 text-theme-textMuted">
                        {message}
                    </Text>

                    <Pressable
                        onPress={onClose}
                        className="rounded-xl bg-theme-primary px-5 py-4"
                    >
                        <Text className="text-center font-bold text-theme-textLight">
                            {buttonText}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}