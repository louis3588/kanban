import {AppTheme} from "@/theme/themes";
import {UserProfileResponse} from "@/client/signalr/profileClient";
import {getConnection} from "@/client/signalr/hubClient";


export interface PreferenceRequest {
    theme: AppTheme;
    defaultBoardId: number | null;
    showOnlineStatus: boolean;
    enableEmailNotifications: boolean;
}

export interface UserPreferences extends PreferenceRequest {
    userProfileResponse: UserProfileResponse;
}

export async function getPreferences(
    token: string, userId: number): Promise<UserPreferences> {
    const connection = await getConnection(token);
    return await connection.invoke<UserPreferences>("GetPreferences", userId)
}

export async function updatePreferences(
    token: string, preferences: PreferenceRequest, id: number): Promise<UserPreferences> {
    const connection = await getConnection(token);
    return await connection.invoke<UserPreferences>("UpdatePreferences", preferences, id)
}