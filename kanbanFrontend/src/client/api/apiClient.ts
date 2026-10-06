import {UserProfileResponse} from "@/client/signalr/profileClient";

let BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if(!BASE_URL){
    BASE_URL = "https://localhost:7293"
}

type LoginRequest = {
    identifier: string;
    password: string;
};

type RegisterRequest = {
    username: string;
    firstName: string;
    lastName: string | null;
    email: string;
    password: string;
}

export type CredentialsResponse = {
    userId: string;
    email: string;
};

export type AuthResponse = CredentialsResponse & {
    token: string;
    firstName: string;
    lastName: string | null;
    username: string;
};

export type RegisterResponse = CredentialsResponse & {
    message: string;
};

export async function loginClient(
    identifier: string,
    password: string
) : Promise<AuthResponse> {
    const request: LoginRequest = {
        identifier, password
    };

    const response = await fetch(`${BASE_URL}/api/Auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
    });

    if(!response.ok){
        if(response.status == 401){
            throw new Error("Invalid username or password");
        }
        throw new Error("Something went wrong while logging in");
    }

    return response.json();
}

export async function registerClient(
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string
): Promise<RegisterResponse> {
    const request: RegisterRequest = {
        username, firstName, lastName: lastName || null, email, password
    };

    const response = await fetch(`${BASE_URL}/api/Auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
    });

    if(!response.ok){
        const errorResponse = await response.json();
        throw new Error(errorResponse.message);
    }

    return response.json();
}

export async function confirmEmail(userId: number, token: string) : Promise<AuthResponse>{
    const response = await fetch(
        `${BASE_URL}/api/email-confirmation/confirm` +
        `?userId=${userId}&token=${encodeURIComponent(token)}`,
        {
            method: "POST",
        }
    );

    if (!response.ok) {
        const errorResponse = await response.json();

        throw new Error(
            errorResponse.message ??
            "The email confirmation link is invalid or has expired."
        );
    }

    return response.json();
}

export const passwordResetApi = async (email: string): Promise<boolean> => {
    const response = await fetch(
        `${BASE_URL}/api/email-confirmation/password-reset?email=${encodeURIComponent(email)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.message || "Something went wrong. Please try again."
        );
    }

    return data;
};

export const resetPasswordApi = async (
    user: number,
    password: string
): Promise<UserProfileResponse> => {
    const response = await fetch(
        `${BASE_URL}/api/email-confirmation/reset-password` +
        `?user=${user}` +
        `&password=${encodeURIComponent(password)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.message || "Unable to reset your password."
        );
    }

    return data as UserProfileResponse;
};