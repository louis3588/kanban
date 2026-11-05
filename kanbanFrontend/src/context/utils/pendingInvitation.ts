import AsyncStorage from "@react-native-async-storage/async-storage";
import {router} from "expo-router";
const PENDING_INVITATION_KEY = "kanban:pending-invitation";
const MAX_PENDING_AGE = 604800000;

interface PendingInvitation {
    code: string;
    savedAt: number;
}

export function isValidInviteCode(code: unknown): code is string {
    return (
        typeof code === "string" && /^[A-Za-z0-9_-]{43}$/.test(code)
    );
}

export async function savePendingInviteCode(code: string): Promise<void> {
    if(!isValidInviteCode(code)) {
        throw new Error("Invalid invite code");
    }

    const invitations: PendingInvitation = {
        code, savedAt: Date.now()
    };

    await AsyncStorage.setItem(PENDING_INVITATION_KEY, JSON.stringify(invitations));
}

export async function getPendingInviteCode(): Promise<string | null> {
    const raw = await AsyncStorage.getItem(PENDING_INVITATION_KEY);
    if(!raw){
        return null;
    }

    try{
        const invitation = JSON.parse(raw) as Partial<PendingInvitation>;
        const valid =
            isValidInviteCode(invitation.code) &&
            typeof invitation.savedAt === "number" &&
            Date.now() >= invitation.savedAt &&
            Date.now() - invitation.savedAt < MAX_PENDING_AGE;

        if(!valid){
            await AsyncStorage.removeItem(PENDING_INVITATION_KEY);
            return null;
        }

        return invitation.code!;
    } catch {
        await AsyncStorage.removeItem(PENDING_INVITATION_KEY);
        return null;
    }
}

export async function clearPendingInviteCode(
    expectedCode?: string
): Promise<void> {
    if (expectedCode) {
        const storedCode = await getPendingInviteCode();

        if (storedCode !== expectedCode) return;
    }

    await AsyncStorage.removeItem(
        PENDING_INVITATION_KEY
    );
}

export async function continueAfterAuthentication(): Promise<void> {
    const pendingCode = await getPendingInviteCode();
    if(pendingCode){
        router.replace({
            pathname: "/join/[code]",
            params: { code: pendingCode}
        });
        return;
    }
    router.replace("/workspaces")
}

