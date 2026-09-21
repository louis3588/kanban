

let BASE_URL = process.env.API_URL;

if(!BASE_URL){
    BASE_URL = "https://localhost:7293/api"
}

type LoginRequest = {
    username: string;
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
    username: string,
    password: string
) : Promise<AuthResponse> {
    const request: LoginRequest = {
      username, password
    };

    const response = await fetch(`${BASE_URL}/Auth/login`, {
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

    const response = await fetch(`${BASE_URL}/Auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
    });

    if(!response.ok){
        if(response.status === 409){
            const errorResponse = await response.json();
            throw new Error(errorResponse.message);
        }

        throw new Error("Something went wrong while creating your account");
    }

    return response.json();
}

export async function confirmEmail(userId: number, token: string) : Promise<AuthResponse>{
    const response = await fetch(
        `${BASE_URL}/email-confirmation/confirm` +
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

