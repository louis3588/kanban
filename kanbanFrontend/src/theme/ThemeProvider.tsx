
import React, { createContext, useContext } from "react";
import { View } from "react-native";
import { vars } from "nativewind";

import { AppTheme, themes, ThemeColors, DEFAULT_THEME } from "./themes";

const colorVariables: Record<keyof ThemeColors, string> = {
    background: "--color-theme-background",
    backgroundDark: "--color-theme-background-dark",
    surface: "--color-theme-surface",
    surfaceLight: "--color-theme-surface-light",
    primary: "--color-theme-primary",
    primaryDark: "--color-theme-primary-dark",
    text: "--color-theme-text",
    textLight: "--color-theme-text-light",
    textMuted: "--color-theme-text-muted",
    border: "--color-theme-border",
    borderDark: "--color-theme-border-dark",
    accent: "--color-theme-accent",
    success: "--color-theme-success",
    error: "--color-theme-error",
    logoSepia: "--color-theme-logo-sepia",
};

function toRgb(hex: string): string {
    const value = hex.replace("#", "");

    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);

    return `${red} ${green} ${blue}`;
}

type ThemeContextValue = {
    theme: AppTheme;
    colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({
    theme: DEFAULT_THEME,
    colors: themes[DEFAULT_THEME],
});

export function useTheme() {
    return useContext(ThemeContext);
}

type ThemeProviderProps = {
    theme?: AppTheme;
    children: React.ReactNode;
};

export default function ThemeProvider({
                                          theme = DEFAULT_THEME,
                                          children,
                                      }: ThemeProviderProps) {
    const colors = themes[theme] ?? themes[DEFAULT_THEME];

    const themeVariables = Object.fromEntries(
        Object.entries(colorVariables).map(([key, variable]) => [
            variable,
            toRgb(colors[key as keyof ThemeColors]),
        ]),
    );

    return (
        <ThemeContext.Provider value={{ theme, colors }}>
            <View style={[{ flex: 1 }, vars(themeVariables)]}>
                {children}
            </View>
        </ThemeContext.Provider>
    );
}
