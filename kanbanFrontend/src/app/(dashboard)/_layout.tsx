import { View, Text } from "react-native";
import { Slot } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { AppTheme } from "@/theme/themes";
import { themes } from "@/theme/themes";
import ThemeProvider from "@/theme/ThemeProvider";
import HamburgerMenu from "@/components/ui/HamburgerMenu";

export default function DashboardLayout() {
    const { isAuthenticated, preferences } = useAuth();
    const theme = preferences?.theme ?? AppTheme.SepiaLight;
    const colors = themes[theme] ?? themes[AppTheme.SepiaLight];

    return (
        <ThemeProvider theme={theme}>
            <View
                className="flex-1"
                style={{ backgroundColor: colors.background }}
            >
                {isAuthenticated && (
                    <View
                        className="min-h-14 flex-row items-center justify-between border-b px-4 py-2"
                        style={{
                            backgroundColor: colors.surface,
                            borderBottomColor: colors.border,
                        }}
                    >
                        <Text
                            className="text-lg font-bold"
                            style={{ color: colors.text }}
                        >
                            Kanban
                        </Text>

                        <HamburgerMenu />
                    </View>
                )}

                <View className="flex-1">
                    <Slot />
                </View>
            </View>
        </ThemeProvider>
    );
}
