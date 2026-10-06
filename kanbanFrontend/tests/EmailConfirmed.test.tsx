import React from "react";
import {
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react-native";
import {Text} from "react-native";
import {router} from "expo-router";

import EmailConfirmedScreen from "@/app/(auth)/email-confirmed";
import {confirmEmail} from "@/client/api/apiClient";

const mockedRouter = router as jest.Mocked<typeof router>;

const mockLogin = jest.fn();

let mockParams = {
    userId: "123",
    token: "test-token",
};

jest.mock("expo-router", () => ({
    router: {
        replace: jest.fn(),
    },
    useLocalSearchParams: () => mockParams,
}));

jest.mock("@/client/api/apiClient", () => ({
    confirmEmail: jest.fn(),
}));

jest.mock("@/context/AuthContext", () => ({
    useAuth: () => ({
        login: jest.fn(),
    }),
}));

jest.mock("@/components/profile/CreateProfile", () => {
    const React = require("react");
    const {Text} = require("react-native");

    return function MockCreateProfile({
                                          onComplete,
                                          onSkip,
                                      }: {
        onComplete: () => void;
        onSkip: () => void;
    }) {
        return (
            <>
                <Text>Create Profile</Text>

                <Text onPress={onComplete}>
                    Complete Profile
                </Text>

                <Text onPress={onSkip}>
                    Skip Profile
                </Text>
            </>
        );
    };
});

const mockedConfirmEmail = confirmEmail as jest.MockedFunction<
    typeof confirmEmail
>;

describe("EmailConfirmedScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockParams = {
            userId: "123",
            token: "test-token",
        };
    });

    it("shows the confirming state while the email is being confirmed", async () => {
        mockedConfirmEmail.mockReturnValue(
            new Promise(() => {})
        );

        await render(<EmailConfirmedScreen />);

        expect(
            screen.getByText("Confirming your email...")
        ).toBeTruthy();

        expect(mockedConfirmEmail).toHaveBeenCalledWith(
            123,
            "test-token"
        );
    });

    it("shows an error when the confirmation link is missing parameters", async () => {
        mockParams = {
            userId: "",
            token: "",
        };

        await render(<EmailConfirmedScreen />);

        expect(
            await screen.findByText(
                "Email confirmation failed"
            )
        ).toBeTruthy();

        expect(
            screen.getByText("Invalid confirmation link.")
        ).toBeTruthy();

        expect(mockedConfirmEmail).not.toHaveBeenCalled();
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it("confirms the email and logs the user in", async () => {
        mockedConfirmEmail.mockResolvedValue({
            token: "jwt-token",
            userId: '123',
            username: "testuser",
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
        });

        await render(<EmailConfirmedScreen />);

        await waitFor(() => {
            expect(mockedConfirmEmail).toHaveBeenCalledWith(
                123,
                "test-token"
            );
        });

        expect(
            await screen.findByText(
                "Your email has been confirmed"
            )
        ).toBeTruthy();
    });

    it("shows the API error when email confirmation fails", async () => {
        mockedConfirmEmail.mockRejectedValue(
            new Error("Confirmation link has expired.")
        );

        await render(<EmailConfirmedScreen />);

        expect(
            await screen.findByText(
                "Email confirmation failed"
            )
        ).toBeTruthy();

        expect(
            screen.getByText(
                "Confirmation link has expired."
            )
        ).toBeTruthy();

        expect(mockLogin).not.toHaveBeenCalled();
    });

    it("shows the generic error when confirmation fails with a non-Error", async () => {
        mockedConfirmEmail.mockRejectedValue("failure");

        await render(<EmailConfirmedScreen />);

        expect(
            await screen.findByText(
                "Email confirmation failed"
            )
        ).toBeTruthy();

        expect(
            screen.getByText(
                "Something went wrong while confirming your email."
            )
        ).toBeTruthy();
    });

    it("navigates to login from the confirmation error", async () => {
        mockedConfirmEmail.mockRejectedValue(
            new Error("Confirmation failed.")
        );

        await render(<EmailConfirmedScreen />);

        const backToLogin =
            await screen.findByText("Back to login");

        await fireEvent.press(backToLogin);

        expect(mockedRouter.replace).toHaveBeenCalledWith(
            "/(auth)/login"
        );
    });

    it("shows the create profile component when Set up profile is pressed", async () => {
        mockedConfirmEmail.mockResolvedValue({
            token: "jwt-token",
            userId: '123',
            username: "testuser",
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
        });

        await render(<EmailConfirmedScreen />);

        await screen.findByText(
            "Your email has been confirmed"
        );

        await fireEvent.press(
            screen.getByText("Set up profile")
        );

        expect(
            screen.getByText("Create Profile")
        ).toBeTruthy();
    });

    it("navigates to workspaces when profile creation is completed", async () => {
        mockedConfirmEmail.mockResolvedValue({
            token: "jwt-token",
            userId: '123',
            username: "testuser",
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
        });

        await render(<EmailConfirmedScreen />);

        await screen.findByText(
            "Your email has been confirmed"
        );

        await fireEvent.press(
            screen.getByText("Set up profile")
        );

        await fireEvent.press(
            screen.getByText("Complete Profile")
        );

        expect(mockedRouter.replace).toHaveBeenCalledWith(
            "/(dashboard)/workspaces"
        );
    });

    it("skips profile creation and navigates to workspaces", async () => {
        mockedConfirmEmail.mockResolvedValue({
            token: "jwt-token",
            userId: '123',
            username: "testuser",
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
        });

        await render(<EmailConfirmedScreen />);

        await screen.findByText(
            "Your email has been confirmed"
        );

        await fireEvent.press(
            screen.getByText("Skip for now")
        );

        expect(mockedRouter.replace).toHaveBeenCalledWith(
            "/(dashboard)/workspaces"
        );
    });

    it("allows the profile component to be skipped", async () => {
        mockedConfirmEmail.mockResolvedValue({
            token: "jwt-token",
            userId: '123',
            username: "testuser",
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
        });

        await render(<EmailConfirmedScreen />);

        await screen.findByText(
            "Your email has been confirmed"
        );

        await fireEvent.press(
            screen.getByText("Set up profile")
        );

        await fireEvent.press(
            screen.getByText("Skip Profile")
        );

        expect(mockedRouter.replace).toHaveBeenCalledWith(
            "/(dashboard)/workspaces"
        );
    });
});