import {createContext, JSX, ReactNode, useContext, useState} from "react";


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
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
    children: ReactNode | JSX.Element;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}

export function AuthProvider({children}: AuthProviderProps){
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string>("");

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        sessionStorage.setItem("token", newToken);
        setUser(newUser);
        sessionStorage.setItem("user", userToJson(newUser));
    }

    const logout = () => {
        setToken("");
        setUser(null);
    }

    const value: AuthContextType = {
        user, token, isAuthenticated: !!token, login, logout
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}