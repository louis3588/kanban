import { render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import {githubLoginClient, googleLoginClient, microsoftLoginClient} from "@/client/api/apiClient";
import GitHubCallback from "@/app/(auth)/github";
import GoogleCallback from "@/app/(auth)/google";
import MicrosoftCallback from "@/app/(auth)/microsoft";

jest.mock("expo-router", () => ({
    useLocalSearchParams: jest.fn(),
    router: {
        replace: jest.fn(),
    },
}));

jest.mock("@/context/AuthContext", () => ({
    useAuth: jest.fn(),
}));

jest.mock("@/client/api/apiClient", () => ({
    githubLoginClient: jest.fn(),
    googleLoginClient: jest.fn(),
    microsoftLoginClient: jest.fn(),
}));

const mockLogin = jest.fn();

const testUser = {
    token: "fake-jwt-token",
    userId: "1",
    username: "johnsmith",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
};

const providers = [
    {
        name: "GitHub",
        Component: GitHubCallback,
        loginClient: githubLoginClient,
        missingTicketMessage: "GitHub sign-in did not return a login ticket.",
        loadingMessage: /Completing GitHub sign-in/,
    },
    {
        name: "Google",
        Component: GoogleCallback,
        loginClient: googleLoginClient,
        missingTicketMessage: "Google sign-in did not return a login ticket.",
        loadingMessage: /Completing Google sign-in/,
    },
    {
        name: "Microsoft",
        Component: MicrosoftCallback,
        loginClient: microsoftLoginClient,
        missingTicketMessage: "Microsoft sign-in did not return a ticket.",
        loadingMessage: /Completing Microsoft sign-in/,
    },
];

beforeEach(() => {
    jest.resetAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
        login: mockLogin,
    });
});

describe.each(providers)("external login callback", ({
                                                               name,
                                                               Component,
                                                               loginClient,
                                                               missingTicketMessage,
                                                               loadingMessage,
                                                           }) => {
    it("displays the loading screen while login is processing", async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({
            ticket: "valid-ticket",
        });

        (loginClient as jest.Mock).mockReturnValue(new Promise(() => {}));

        await render(<Component />);

        expect(screen.getByText("Signing you in")).toBeTruthy();
        expect(screen.getByText(loadingMessage)).toBeTruthy();
        expect(loginClient).toHaveBeenCalledWith("valid-ticket");
    });

    it("displays an error when the ticket is missing without calling the API", async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({});

        await render(<Component />);

        expect(await screen.findByText("Sign-in unsuccessful")).toBeTruthy();
        expect(screen.getByText(missingTicketMessage)).toBeTruthy();

        expect(loginClient).not.toHaveBeenCalled();
        expect(mockLogin).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
    });

    it("displays an error when login fails", async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({
            ticket: "invalid-ticket",
        });

        (loginClient as jest.Mock).mockRejectedValue(
            new Error("Invalid login ticket"),
        );

        await render(<Component />);

        expect(await screen.findByText("Sign-in unsuccessful")).toBeTruthy();
        expect(screen.getByText("Invalid login ticket")).toBeTruthy();

        expect(loginClient).toHaveBeenCalledWith("invalid-ticket");
        expect(mockLogin).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
    });

    it("logs in and redirects to workspaces when login succeeds", async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({
            ticket: "valid-ticket",
        });

        (loginClient as jest.Mock).mockResolvedValue(testUser);

        await render(<Component />);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith(
                "fake-jwt-token",
                {
                    id: 1,
                    username: "johnsmith",
                    firstName: "John",
                    lastName: name === "GitHub" ? "Smith" : "Smith",
                    email: "john.smith@example.com",
                },
            );

            expect(router.replace).toHaveBeenCalledWith(
                "/(dashboard)/workspaces",
            );
        });

        expect(loginClient).toHaveBeenCalledWith("valid-ticket");
    });
});