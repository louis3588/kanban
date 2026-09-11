import {createContext, JSX, ReactNode, useContext, useState} from "react";


type User = {
    id: number;
    username: string;
    email: string;
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
    const [token, setToken] = useState<string, null>(null);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
    }

    const logout = () => {
        setToken(null);
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