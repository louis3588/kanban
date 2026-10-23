
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    JSX,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { Platform } from "react-native";
import { getConnection, stopConnection } from "@/client/signalr/hubClient";
import { AppTheme } from "@/theme/themes";
import {getPreferences, PreferenceRequest, updatePreferences, UserPreferences} from "@/client/signalr/settingsClient";

type User = {
    id: number;
    username: string;
    firstName: string;
    lastName: string | null;
    email: string;
};

export const userToJson = (user: User): string => {
    return JSON.stringify(user);
};

export const jsonToUser = (json: string): User => {
    return JSON.parse(json) as User;
};

type PreferenceKey = keyof PreferenceRequest;

type AuthContextType = {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    preferences: UserPreferences | null;
    isPreferencesLoading: boolean;
    preferencesError: string | null;

    login: (token: string, user: User) => Promise<void>;
    logout: () => void;

    updatePreference: <K extends PreferenceKey>(
        key: K,
        value: PreferenceRequest[K],
    ) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
    children: ReactNode | JSX.Element;
};

const getStoredValue = async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
        if (typeof sessionStorage === "undefined") {
            return null;
        }

        return sessionStorage.getItem(key);
    }

    return AsyncStorage.getItem(key);
};

const setStoredValue = async (
    key: string,
    value: string,
): Promise<void> => {
    if (Platform.OS === "web") {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(key, value);
        }

        return;
    }

    await AsyncStorage.setItem(key, value);
};

const removeStoredValue = async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(key);
        }

        return;
    }

    await AsyncStorage.removeItem(key);
};

const themeNames = [
    AppTheme.SepiaLight,
    AppTheme.SepiaDark,
    AppTheme.Pastel,
    AppTheme.Light,
    AppTheme.Dark,
    AppTheme.Forest,
];

const normaliseTheme = (value: unknown): AppTheme => {
    if (typeof value === "number" && themeNames[value] !== undefined) {
        return themeNames[value];
    }

    if (
        typeof value === "string" &&
        themeNames.includes(value as AppTheme)
    ) {
        return value as AppTheme;
    }

    return AppTheme.SepiaLight;
};

const toPreferenceRequest = (
    preferences: UserPreferences,
): PreferenceRequest => ({
    theme: preferences.theme,
    defaultBoardId: preferences.defaultBoardId,
    showOnlineStatus: preferences.showOnlineStatus,
    enableEmailNotifications: preferences.enableEmailNotifications,
});


const getPreferencesFromHub = async (
    token: string,
    userId: number,
): Promise<UserPreferences> => {
    return await getPreferences(token, userId);
};

const savePreferencesToHub = async (
    token: string,
    userId: number,
    preferences: UserPreferences,
): Promise<UserPreferences> => {

    const request = toPreferenceRequest(preferences);
    return await updatePreferences(token, request, userId);
};

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [preferences, setPreferences] =
        useState<UserPreferences | null>(null);
    const [isPreferencesLoading, setIsPreferencesLoading] = useState(false);
    const [preferencesError, setPreferencesError] = useState<string | null>(
        null,
    );

    const preferencesRef = useRef<UserPreferences | null>(null);
    const updateQueueRef = useRef<Promise<void>>(Promise.resolve());
    const sessionVersionRef = useRef(0);

    const setCurrentPreferences = (next: UserPreferences | null) => {
        preferencesRef.current = next;
        setPreferences(next);
    };

    const loadPreferences = async (
        currentToken: string,
        currentUser: User,
        sessionVersion: number,
    ): Promise<void> => {
        setIsPreferencesLoading(true);
        setPreferencesError(null);

        try {
            const result = await getPreferencesFromHub(
                currentToken,
                currentUser.id,
            );

            if (sessionVersion !== sessionVersionRef.current) {
                return;
            }

            setCurrentPreferences(result);
        } catch (error) {
            if (sessionVersion !== sessionVersionRef.current) {
                return;
            }

            console.error("Failed to load user preferences:", error);
            setPreferencesError("Could not load your preferences.");
        } finally {
            if (sessionVersion === sessionVersionRef.current) {
                setIsPreferencesLoading(false);
            }
        }
    };

    useEffect(() => {
        let isMounted = true;

        const restoreSession = async () => {
            try {
                const [storedToken, storedUser] = await Promise.all([
                    getStoredValue("token"),
                    getStoredValue("user"),
                ]);

                if (!isMounted) return;

                if (storedToken && storedUser) {
                    try {
                        const parsedUser = jsonToUser(storedUser);

                        if (
                            typeof parsedUser.id === "number" &&
                            typeof parsedUser.username === "string" &&
                            typeof parsedUser.email === "string"
                        ) {
                            const version = ++sessionVersionRef.current;

                            setToken(storedToken);
                            setUser(parsedUser);

                            await loadPreferences(
                                storedToken,
                                parsedUser,
                                version,
                            );
                        } else {
                            await Promise.all([
                                removeStoredValue("token"),
                                removeStoredValue("user"),
                            ]);
                        }
                    } catch (error) {
                        console.error("Failed to restore user session:", error);

                        await Promise.all([
                            removeStoredValue("token"),
                            removeStoredValue("user"),
                        ]);
                    }
                } else {
                    await Promise.all([
                        removeStoredValue("token"),
                        removeStoredValue("user"),
                    ]);
                }
            } catch (error) {
                console.error("Failed to restore authentication session:", error,);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void restoreSession();

        return () => {
            isMounted = false;
        };
    }, []);

    const login = async (
        newToken: string,
        newUser: User,
    ): Promise<void> => {
        const version = ++sessionVersionRef.current;

        setToken(newToken);
        setUser(newUser);
        setCurrentPreferences(null);
        setPreferencesError(null);

        void Promise.all([
            setStoredValue("token", newToken),
            setStoredValue("user", userToJson(newUser)),
        ]).catch(error => {
            console.error("Failed to save authentication session:", error);
        });

        await loadPreferences(newToken, newUser, version);
    };

    const logout = () => {
        ++sessionVersionRef.current;

        setToken(null);
        setUser(null);
        setCurrentPreferences(null);
        setIsPreferencesLoading(false);
        setPreferencesError(null);

        updateQueueRef.current = Promise.resolve();

        void stopConnection().catch((error: any) => {
            console.error("Failed to stop SignalR connection:", error);
        });

        void Promise.all([
            removeStoredValue("token"),
            removeStoredValue("user"),
        ]).catch(error => {
            console.error("Failed to clear authentication session:", error);
        });
    };

    const updatePreference = async <K extends PreferenceKey>(
        key: K,
        value: PreferenceRequest[K],
    ): Promise<void> => {
        if (!token || !user || !preferencesRef.current) {
            throw new Error("Preferences are not ready to be updated.");
        }

        const version = sessionVersionRef.current;
        const nextPreferences: UserPreferences = {
            ...preferencesRef.current,
            [key]: value,
        };

        setCurrentPreferences(nextPreferences);
        setPreferencesError(null);

        const operation = updateQueueRef.current
            .catch(() => undefined)
            .then(async () => {
                if (version !== sessionVersionRef.current) return;

                const snapshot = preferencesRef.current;

                if (!snapshot) return;

                try {
                    const saved = await savePreferencesToHub(
                        token,
                        user.id,
                        snapshot,
                    );

                    if (
                        version === sessionVersionRef.current &&
                        preferencesRef.current === snapshot
                    ) {
                        setCurrentPreferences(saved);
                    }
                } catch (error) {
                    console.error("Failed to update preferences:", error);

                    if (
                        version === sessionVersionRef.current &&
                        preferencesRef.current === snapshot
                    ) {
                        setPreferencesError(
                            "Your change could not be saved. Reloading your saved preferences.",
                        );

                        try {
                            const saved = await getPreferencesFromHub(
                                token,
                                user.id,
                            );

                            if (version === sessionVersionRef.current) {
                                setCurrentPreferences(saved);
                            }
                        } catch (reloadError) {
                            console.error(
                                "Failed to reload saved preferences:",
                                reloadError,
                            );
                        }
                    }

                    throw error;
                }
            });

        updateQueueRef.current = operation.then(
            () => undefined,
            () => undefined,
        );

        await operation;
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        preferences,
        isPreferencesLoading,
        preferencesError,
        login,
        logout,
        updatePreference,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
