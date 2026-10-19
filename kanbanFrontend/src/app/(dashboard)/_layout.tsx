import {Slot} from "expo-router";
import {AppTheme} from "@/theme/themes";
import ThemeProvider from "@/theme/ThemeProvider";

export default function DashboardLayout() {
    return (
        <ThemeProvider theme={AppTheme.SepiaLight}>
            <Slot />
        </ThemeProvider>
    )
}