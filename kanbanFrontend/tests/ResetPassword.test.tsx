import React from "react";
import {
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react-native";

import ResetPasswordScreen from "@/app/(auth)/reset-password";
import {resetPasswordApi} from "@/client/api/apiClient";
import {router} from "expo-router";

const mockReplace = jest.fn();
const mockedRouter = router as jest.Mocked<typeof router>

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
    resetPasswordApi: jest.fn(),
}));

jest.mock("../src/components/Alert", () => {
    const React = require("react");
    const {Text} = require("react-native");

    return function MockAlert({
                                  visible,
                                  title,
                                  message,
                                  buttonText,
                                  onClose,
                              }: any) {
        if (!visible) {
            return null;
        }

        return (
            <>
                <Text>{title}</Text>
                <Text>{message}</Text>
                <Text onPress={onClose}>{buttonText}</Text>
            </>
        );
    };
});

describe("ResetPasswordScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockParams = {
            userId: "123",
            token: "test-token",
        };
    });

    it("renders the reset password page", async () => {
        await render(<ResetPasswordScreen />);

        expect(
            screen.getByText("Reset your password")
        ).toBeTruthy();

        expect(
            screen.getByPlaceholderText("New password")
        ).toBeTruthy();

        expect(
            screen.getByPlaceholderText("Confirm password")
        ).toBeTruthy();

        expect(
            screen.getByText("Reset password")
        ).toBeTruthy();
    });

    it("does not call the API when the reset link is invalid", async () => {
        mockParams = {
            userId: "",
            token: "",
        };

        await render(<ResetPasswordScreen/>);

        await fireEvent.press(
            screen.getByText("Reset password")
        );

        expect(
            await screen.findByText(
                "This password reset link is invalid."
            )
        ).toBeTruthy();

        expect(resetPasswordApi).not.toHaveBeenCalled();
    });

    it("does not call the API when the password is empty", async () => {
        await render(<ResetPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("Confirm password"),
            "password123"
        );

        await fireEvent.press(
            screen.getByText("Reset password")
        );

        expect(
            await screen.findByText(
                "Please enter a new password."
            )
        ).toBeTruthy();

        expect(resetPasswordApi).not.toHaveBeenCalled();
    });

    it("does not call the API when the confirmation password is empty", async () => {
        await render(<ResetPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("New password"),
            "password123"
        );

        await fireEvent.press(
            screen.getByText("Reset password")
        );

        expect(
            await screen.findByText(
                "Please confirm your new password."
            )
        ).toBeTruthy();

        expect(resetPasswordApi).not.toHaveBeenCalled();
    });

    it("shows that the passwords do not match", async () => {
        await render(<ResetPasswordScreen />);

        await fireEvent.changeText(
            screen.getByPlaceholderText("New password"),
            "password123"
        );

        await fireEvent.changeText(
            screen.getByPlaceholderText("Confirm password"),
            "differentPassword"
        );

        expect(
            screen.getByText("Passwords do not match")
        ).toBeTruthy();
    });

    it("does not call the API when the passwords do not match", async () => {
        await render(<ResetPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("New password"),
            "password123"
        );

        await fireEvent.changeText(
            screen.getByPlaceholderText("Confirm password"),
            "differentPassword"
        );

        await fireEvent.press(
            screen.getByText("Reset password")
        );

        expect(
            await screen.findByText(
                "The passwords do not match."
            )
        ).toBeTruthy();

        expect(resetPasswordApi).not.toHaveBeenCalled();
    });

    it("shows that the passwords match", async () => {
        await render(<ResetPasswordScreen />);

        await fireEvent.changeText(
            screen.getByPlaceholderText("New password"),
            "password123"
        );

        await fireEvent.changeText(
            screen.getByPlaceholderText("Confirm password"),
            "password123"
        );

        expect(
            screen.getByText("Passwords match")
        ).toBeTruthy();
    });

    it("calls the mocked API with the user ID and password", async () => {
        (resetPasswordApi as jest.Mock).mockResolvedValue({
            userId: 123,
            username: "testuser",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
        });

        await render(<ResetPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("New password"),
            "password123"
        );

        await fireEvent.changeText(
            screen.getByPlaceholderText("Confirm password"),
            "password123"
        );

        await fireEvent.press(
            screen.getByText("Reset password")
        );

        await waitFor(() => {
            expect(resetPasswordApi).toHaveBeenCalledWith(
                123,
                "password123"
            );
        });

        expect(resetPasswordApi).toHaveBeenCalledTimes(1);
    });

    it("shows the success alert after a successful password reset", async () => {
        (resetPasswordApi as jest.Mock).mockResolvedValue({
            userId: 123,
            username: "testuser",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
        });

        await render(<ResetPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("New password"),
            "password123"
        );

        await fireEvent.changeText(
            screen.getByPlaceholderText("Confirm password"),
            "password123"
        );

        await fireEvent.press(
            screen.getByText("Reset password")
        );

        expect(
            await screen.findByText("Password reset")
        ).toBeTruthy();

        expect(
            screen.getByText(
                "Your password has been successfully reset. You can now log in with your new password."
            )
        ).toBeTruthy();
    });

    it("shows the API error when the mocked API rejects", async () => {
        (resetPasswordApi as jest.Mock).mockRejectedValue(
            new Error("This password reset link has expired.")
        );

        await render(<ResetPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("New password"),
            "password123"
        );

        await fireEvent.changeText(
            screen.getByPlaceholderText("Confirm password"),
            "password123"
        );

        await fireEvent.press(
            screen.getByText("Reset password")
        );

        expect(
            await screen.findByText(
                "This password reset link has expired."
            )
        ).toBeTruthy();
    });

    it("navigates to login from the login link", async () => {
        await render(<ResetPasswordScreen />);

        await fireEvent.press(screen.getByText("Log in"));

        expect(mockedRouter.replace).toHaveBeenCalledWith({
            pathname: "/(auth)/login",
        });
    });

    it("navigates to login after successfully resetting the password", async () => {
        (resetPasswordApi as jest.Mock).mockResolvedValue({
            userId: 123,
            username: "testuser",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
        });

        await render(<ResetPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("New password"),
            "password123"
        );

        await fireEvent.changeText(
            screen.getByPlaceholderText("Confirm password"),
            "password123"
        );

        await fireEvent.press(
            screen.getByText("Reset password")
        );

        const backToLogin =
            await screen.findByText("Back to login");

        await fireEvent.press(backToLogin);

        expect(mockedRouter.replace).toHaveBeenCalledWith({
            pathname: "/(auth)/login",
        });
    });
});