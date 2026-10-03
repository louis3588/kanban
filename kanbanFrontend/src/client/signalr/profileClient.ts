import {getConnection} from "@/client/signalr/hubClient";


export interface UserProfile {
    userId?: number;
    firstname?: string;
    lastname?: string;
    profileImage?: string;
    bio?: string;
}

export interface UserProfileResponse extends UserProfile{
    username?: string;
    email?: string;
}

export const getUserProfile = async (token: string, userId: number): Promise<UserProfileResponse> => {
    const connection = await getConnection(token);
    return await connection.invoke<UserProfileResponse>("GetUserProfile", userId);
}

export const editUserProfile = async (token: string, profile: UserProfile): Promise<UserProfileResponse> => {
    const connection = await getConnection(token);
    return await connection.invoke<UserProfileResponse>("EditProfile", profile);
}