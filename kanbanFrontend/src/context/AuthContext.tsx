import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    JSX,
    ReactNode,
    useContext,
    useEffect,
    useState
} from "react";
import { Platform } from "react-native";

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

type AuthContextType = {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
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
    value: string
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

    useEffect(() => {
        let isMounted = true;

        const restoreSession = async () => {
            try {
                const [storedToken, storedUser] = await Promise.all([
                    getStoredValue("token"),
                    getStoredValue("user")
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
                            setToken(storedToken);
                            setUser(parsedUser);
                        } else {
                            await Promise.all([
                                removeStoredValue("token"),
                                removeStoredValue("user")
                            ]);
                        }
                    } catch {
                        await Promise.all([
                            removeStoredValue("token"),
                            removeStoredValue("user")
                        ]);
                    }
                } else {
                    await Promise.all([
                        removeStoredValue("token"),
                        removeStoredValue("user")
                    ]);
                }
            } catch (error) {
                console.error("Failed to restore authentication session:", error);
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

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);

        void Promise.all([
            setStoredValue("token", newToken),
            setStoredValue("user", userToJson(newUser))
        ]).catch(error => {
            console.error("Failed to save authentication session:", error);
        });
    };

    const logout = () => {
        setToken(null);
        setUser(null);

        void Promise.all([
            removeStoredValue("token"),
            removeStoredValue("user")
        ]).catch(error => {
            console.error("Failed to clear authentication session:", error);
        });
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}