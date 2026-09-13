

const BASE_URL = process.env.API_URL;

if(!BASE_URL){
    throw new Error("API endpoint is not configured");
}

type LoginRequest = {
    username: string;
    password: string;
};

type AuthResponse = {
    token: string;
    userId: number;
    username: string;
    email: string;
};

type RegisterRequest = {
    username: string;
    email: string;
    password: string;
}

export async function loginClient(
    username: string,
    password: string
) : Promise<AuthResponse> {
    const request: LoginRequest = {
      username, password
    };

    const response = await fetch(`${BASE_URL}/auth/login`, {
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
    email: string,
    password: string
): Promise<AuthResponse> {
    const request: RegisterRequest = {
        username, email, password
    };

    const response = await fetch(`${BASE_URL}/auth/register`, {
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

