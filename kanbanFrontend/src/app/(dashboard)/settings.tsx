import {useState} from "react";
import {ActivityIndicator, Pressable, ScrollView, Switch, Text, View,} from "react-native";

import {useAuth} from "@/context/AuthContext";
import {AppTheme, ThemeColors, themes} from "@/theme/themes";

const THEME_OPTIONS: { value: AppTheme; label: string }[] = [
    { value: AppTheme.SepiaLight, label: "Sepia Light" },
    { value: AppTheme.SepiaDark, label: "Sepia Dark" },
    { value: AppTheme.Pastel, label: "Pastel" },
    { value: AppTheme.Light, label: "Light" },
    { value: AppTheme.Dark, label: "Dark" },
    { value: AppTheme.Forest, label: "Forest" },
];

type SettingRowProps = {
    title: string;
    description: string;
    value: boolean;
    colours: ThemeColors;
    disabled?: boolean;
    onValueChange: (value: boolean) => void;
};

function SettingRow({
                        title,
                        description,
                        value,
                        colours,
                        disabled = false,
                        onValueChange,
                    }: SettingRowProps) {

    return (
        <View
            className="flex-row items-center justify-between border-b py-4"
            style={{ borderBottomColor: colours.border }}
        >
            <View className="flex-1 pr-3">
                <Text
                    className="text-[15px] font-semibold"
                    style={{ color: colours.text }}
                >
                    {title}
                </Text>

                <Text
                    className="mt-1 text-[13px] leading-5"
                    style={{ color: colours.textMuted }}
                >
                    {description}
                </Text>
            </View>

            <Switch
                value={value}
                disabled={disabled}
                onValueChange={onValueChange}
                trackColor={{
                    false: colours.borderDark,
                    true: colours.primary,
                }}
                thumbColor={colours.surface}
            />
        </View>
    );
}

export default function SettingsScreen() {
    const {
        preferences,
        isPreferencesLoading,
        preferencesError,
        updatePreference,
    } = useAuth();

    const [pendingChanges, setPendingChanges] = useState(0);
    const defaultTheme = AppTheme.SepiaLight;
    const theme = preferences?.theme ?? defaultTheme;
    const colours = themes[theme] ?? themes[defaultTheme];
    const isReady = preferences !== null && !isPreferencesLoading;

    const changePreference = async <K extends
            "theme" | "defaultBoardId" | "showOnlineStatus" | "enableEmailNotifications">(
        key: K,
        value: NonNullable<typeof preferences>[K],
    ) => {
        setPendingChanges(count => count + 1);

        try {
            await updatePreference(key, value);
        } catch {

        } finally {
            setPendingChanges(count => Math.max(0, count - 1));
        }
    };

    if (isPreferencesLoading || !preferences) {
        return (
            <View
                className="flex-1 items-center justify-center px-6"
                style={{ backgroundColor: colours.background }}
            >
                {isPreferencesLoading ? (
                    <>
                        <ActivityIndicator
                            size="large"
                            color={colours.primary}
                        />
                        <Text
                            className="mt-3 text-[15px]"
                            style={{ color: colours.text }}
                        >
                            Loading your settings...
                        </Text>
                    </>
                ) : (
                    <>
                        <Text
                            className="mb-2 text-center text-[21px] font-bold"
                            style={{ color: colours.text }}
                        >
                            Settings unavailable
                        </Text>

                        <Text
                            className="mb-2 text-center text-sm leading-5"
                            style={{ color: colours.textMuted }}
                        >
                            {preferencesError ??
                                "Your preferences haven't been loaded yet."}
                        </Text>

                        <Text
                            className="text-center text-sm leading-5"
                            style={{ color: colours.textMuted }}
                        >
                            Please return to the app and try again.
                        </Text>
                    </>
                )}
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1"
            style={{ backgroundColor: colours.background }}
        >
            <View className="w-full max-w-4xl self-center px-5 pb-10 pt-5">
                <Text
                    className="text-3xl font-bold"
                    style={{ color: colours.text }}
                >
                    Settings
                </Text>

                <Text
                    className="mb-5 mt-2 text-[15px] leading-6"
                    style={{ color: colours.textMuted }}
                >
                    Personalise your Kanban experience. Your changes save
                    automatically.
                </Text>

                {pendingChanges > 0 && (
                    <View className="mb-4 flex-row items-center gap-2">
                        <ActivityIndicator
                            size="small"
                            color={colours.primary}
                        />
                        <Text
                            className="text-[13px]"
                            style={{ color: colours.textMuted }}
                        >
                            Saving changes...
                        </Text>
                    </View>
                )}

                {preferencesError && (
                    <View
                        className="mb-4 rounded-xl border p-3"
                        style={{
                            backgroundColor: colours.surface,
                            borderColor: colours.error,
                        }}
                    >
                        <Text style={{ color: colours.error }}>
                            {preferencesError}
                        </Text>
                    </View>
                )}

                <View
                    className="mb-[18px] rounded-2xl border p-4"
                    style={{
                        backgroundColor: colours.surface,
                        borderColor: colours.border,
                    }}
                >
                    <Text
                        className="mb-1 text-xl font-bold"
                        style={{ color: colours.text }}
                    >
                        Appearance
                    </Text>

                    <Text
                        className="mb-3 mt-2 text-sm leading-5"
                        style={{ color: colours.textMuted }}
                    >
                        Choose the colour theme used throughout the app.
                    </Text>

                    {THEME_OPTIONS.map(option => {
                        const preview = themes[option.value];
                        const selected = preferences.theme === option.value;

                        return (
                            <Pressable
                                key={option.value}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: selected }}
                                disabled={!isReady}
                                onPress={() => {
                                    if (selected) return;
                                    void changePreference("theme", option.value);
                                }}
                                className="mt-2 min-h-[52px] flex-row items-center rounded-xl px-3"
                                style={{
                                    backgroundColor: preview.background,
                                    borderColor: selected
                                        ? colours.primary
                                        : preview.border,
                                    borderWidth: selected ? 2 : 1,
                                }}
                            >
                                <View
                                    className="mr-3 h-[26px] w-[26px] rounded-full border"
                                    style={{
                                        backgroundColor: preview.primary,
                                        borderColor: preview.border,
                                    }}
                                />

                                <Text
                                    className="flex-1 text-[15px] font-semibold"
                                    style={{ color: preview.text }}
                                >
                                    {option.label}
                                </Text>

                                {selected && (
                                    <Text
                                        className="text-xs font-semibold"
                                        style={{ color: preview.text }}
                                    >
                                        Selected
                                    </Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                <View
                    className="mb-[18px] rounded-2xl border p-4"
                    style={{
                        backgroundColor: colours.surface,
                        borderColor: colours.border,
                    }}
                >
                    <Text
                        className="mb-1 text-xl font-bold"
                        style={{ color: colours.text }}
                    >
                        Workspace
                    </Text>

                    <Text
                        className="mt-3 text-[15px] font-semibold"
                        style={{ color: colours.text }}
                    >
                        Default board
                    </Text>

                    <View
                        className="mt-2 rounded-lg border p-3"
                        style={{
                            backgroundColor: colours.background,
                            borderColor: colours.border,
                        }}
                    >
                        <Text style={{ color: colours.textMuted }}>
                            {preferences.defaultBoardId === null
                                ? "No default board selected"
                                : `Board ID: ${preferences.defaultBoardId}`}
                        </Text>
                    </View>

                    <Text
                        className="mb-1 mt-3 text-sm leading-5"
                        style={{ color: colours.textMuted }}
                    >
                        Board selection will be available when board selection
                        is implemented.
                    </Text>
                </View>

                <View
                    className="mb-[18px] rounded-2xl border p-4"
                    style={{
                        backgroundColor: colours.surface,
                        borderColor: colours.border,
                    }}
                >
                    <Text
                        className="mb-1 text-xl font-bold"
                        style={{ color: colours.text }}
                    >
                        Privacy and notifications
                    </Text>

                    <SettingRow
                        title="Online status"
                        description="Allow other users to see when you're online."
                        value={preferences.showOnlineStatus}
                        colours={colours}
                        disabled={!isReady}
                        onValueChange={value => {
                            void changePreference("showOnlineStatus", value);
                        }}
                    />

                    <View
                        className="border-b-0"
                        style={{ borderBottomColor: colours.border }}
                    >
                        <SettingRow
                            title="Email notifications"
                            description="Receive notifications by email."
                            value={preferences.enableEmailNotifications}
                            colours={colours}
                            disabled={!isReady}
                            onValueChange={value => {
                                void changePreference(
                                    "enableEmailNotifications",
                                    value,
                                );
                            }}
                        />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}


