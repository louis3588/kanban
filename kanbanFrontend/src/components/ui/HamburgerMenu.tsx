import {useAuth} from "@/context/AuthContext";
import {useState} from "react";
import {AppTheme, themes} from "@/theme/themes";
import {router} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {Modal, Pressable, View, Text} from "react-native";

export default function HamburgerMenu(){
    const {isAuthenticated} = useAuth();
    const {preferences} = useAuth();
    const [menuVisible, setMenuVisible] = useState(false);

    const theme = preferences?.theme ?? AppTheme.SepiaLight;
    const colours = themes[theme] ?? themes[AppTheme.SepiaLight];

    if(!isAuthenticated){
        return null;
    }

    const openSettings = () => {
        setMenuVisible(!menuVisible);
        // @ts-ignore
        router.push(`/(dashboard)/settings`);
    }

    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
                accessibilityState={{ expanded: menuVisible }}
                onPress={() => setMenuVisible(true)}
                className="h-10 w-10 items-center justify-center rounded-lg"
                style={({ pressed }) => ({
                    backgroundColor: pressed
                        ? colours.border
                        : "transparent",
                })}
            >
                <Ionicons
                    name="menu"
                    size={28}
                    color={colours.text}
                />
            </Pressable>

            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
                statusBarTranslucent
            >
                <View className="flex-1 flex-row">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close navigation menu"
                        onPress={() => setMenuVisible(false)}
                        className="absolute inset-0"
                        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
                    />

                    <View
                        className="ml-auto h-full w-72 max-w-[85%] px-4 pb-6 pt-14 shadow-xl"
                        style={{
                            backgroundColor: colours.surface,
                            borderLeftWidth: 1,
                            borderLeftColor: colours.border,
                        }}
                    >
                        <View
                            className="mb-4 flex-row items-center justify-between border-b pb-4"
                            style={{ borderBottomColor: colours.border }}
                        >
                            <Text
                                className="text-xl font-bold"
                                style={{ color: colours.text }}
                            >
                                Navigation
                            </Text>

                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Close menu"
                                onPress={() => setMenuVisible(false)}
                                hitSlop={10}
                                className="h-9 w-9 items-center justify-center rounded-lg"
                            >
                                <Ionicons
                                    name="close"
                                    size={25}
                                    color={colours.text}
                                />
                            </Pressable>
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            onPress={openSettings}
                            className="min-h-12 flex-row items-center rounded-lg px-3 py-3"
                            style={({ pressed }) => ({
                                backgroundColor: pressed
                                    ? colours.border
                                    : "transparent",
                            })}
                        >
                            <Ionicons
                                name="settings-outline"
                                size={22}
                                color={colours.text}
                            />

                            <Text
                                className="ml-3 flex-1 text-base font-semibold"
                                style={{ color: colours.text }}
                            >
                                Settings
                            </Text>

                            <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={colours.textMuted}
                            />
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </>
    );
}