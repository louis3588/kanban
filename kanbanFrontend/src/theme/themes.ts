
export enum AppTheme {
    SepiaLight = "SepiaLight",
    SepiaDark = "SepiaDark",
    Pastel = "Pastel",
    Light = "Light",
    Dark = "Dark",
    Forest = "Forest",
    Bamboo = "Bamboo",
    Red = "Red"
}

export type ThemeColors = {
    background: string;
    backgroundDark: string;
    surface: string;
    surfaceLight: string;
    primary: string;
    primaryDark: string;
    text: string;
    textLight: string;
    textMuted: string;
    border: string;
    borderDark: string;
    accent: string;
    success: string;
    error: string;
    logoSepia: string;
};

export const themes: Record<AppTheme, ThemeColors> = {
    [AppTheme.SepiaLight]: {
        background: "#8f7257",
        backgroundDark: "#6f5742",
        surface: "#f3e7d0",
        surfaceLight: "#f9f0e1",
        primary: "#5c4633",
        primaryDark: "#4b3828",
        text: "#4b3828",
        textLight: "#fff5e6",
        textMuted: "#80664b",
        border: "#d7c3a7",
        borderDark: "#95765a",
        accent: "#a08361",
        success: "#557a5a",
        error: "#a34d43",
        logoSepia: "#e8a66d",
    },

    [AppTheme.SepiaDark]: {
        background: "#2e241b",
        backgroundDark: "#1c1712",
        surface: "#3d2f24",
        surfaceLight: "#4e3b2c",
        primary: "#8f7257",
        primaryDark: "#a08361",
        text: "#f3e7d0",
        textLight: "#fff5e6",
        textMuted: "#c4ad91",
        border: "#5e4b37",
        borderDark: "#80664b",
        accent: "#c6a77d",
        success: "#8ebf96",
        error: "#e08b80",
        logoSepia: "#e8a66d",
    },

    [AppTheme.Pastel]: {
        background: "#eaf2e7",
        backgroundDark: "#d6e5d4",
        surface: "#ffffff",
        surfaceLight: "#f6faf4",
        primary: "#6b8f7a",
        primaryDark: "#527460",
        text: "#2e3a32",
        textLight: "#ffffff",
        textMuted: "#68786d",
        border: "#d6e3d1",
        borderDark: "#a8c2a8",
        accent: "#b8a5d9",
        success: "#7bb59b",
        error: "#e58aa0",
        logoSepia: "#a58bc9",
    },

    [AppTheme.Light]: {
        background: "#ffffff",
        backgroundDark: "#f3f4f6",
        surface: "#f9fafb",
        surfaceLight: "#ffffff",
        primary: "#2563eb",
        primaryDark: "#1d4ed8",
        text: "#111827",
        textLight: "#ffffff",
        textMuted: "#6b7280",
        border: "#e5e7eb",
        borderDark: "#d1d5db",
        accent: "#6366f1",
        success: "#16a34a",
        error: "#ef4444",
        logoSepia: "#8b5cf6",
    },

    [AppTheme.Dark]: {
        background: "#0b0f14",
        backgroundDark: "#000000",
        surface: "#1e293b",
        surfaceLight: "#273449",
        primary: "#3b82f6",
        primaryDark: "#2563eb",
        text: "#f8fafc",
        textLight: "#ffffff",
        textMuted: "#a1aab8",
        border: "#334155",
        borderDark: "#475569",
        accent: "#6366f1",
        success: "#22c55e",
        error: "#ef4444",
        logoSepia: "#8b5cf6",
    },

    [AppTheme.Forest]: {
        background: "#183d2e",
        backgroundDark: "#102b20",
        surface: "#264a3b",
        surfaceLight: "#315744",
        primary: "#4caf50",
        primaryDark: "#388e3c",
        text: "#e8f5e9",
        textLight: "#ffffff",
        textMuted: "#b2cdb8",
        border: "#3a5a46",
        borderDark: "#547662",
        accent: "#81c784",
        success: "#4caf50",
        error: "#e57373",
        logoSepia: "#a7d7c5",
    },

    [AppTheme.Bamboo]: {
        background: "#dce5cf",
        backgroundDark: "#b9c99d",
        surface: "#f4f0df",
        surfaceLight: "#fbf8ed",
        primary: "#416747",
        primaryDark: "#2e4d34",
        text: "#263d2b",
        textLight: "#ffffff",
        textMuted: "#66775c",
        border: "#c4d1b3",
        borderDark: "#91a47e",
        accent: "#a88b5e",
        success: "#487a4e",
        error: "#a9473f",
        logoSepia: "#78965b",
    },

    [AppTheme.Red]: {
        background: "#ead3cf",
        backgroundDark: "#d3aaa5",
        surface: "#fff4ec",
        surfaceLight: "#fffaf6",
        primary: "#a52c38",
        primaryDark: "#76202b",
        text: "#48242a",
        textLight: "#ffffff",
        textMuted: "#86646a",
        border: "#e5c4bd",
        borderDark: "#c28b87",
        accent: "#d69b91",
        success: "#477653",
        error: "#b42332",
        logoSepia: "#a52c38",
    },
};

export const DEFAULT_THEME = AppTheme.SepiaLight;
