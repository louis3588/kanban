import React from "react";
import {Text} from "react-native";
import {
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react-native";

import ForgotPasswordScreen from "@/app/(auth)/forgot-password";
import {passwordResetApi} from "@/client/api/apiClient";
import {router} from "expo-router";

const mockedRouter = router as jest.Mocked<typeof router>

jest.mock("expo-router", () => ({
    router: {
        replace: jest.fn()
    },
}));

jest.mock("../src/client/api/apiClient", () => ({
    passwordResetApi: jest.fn(),
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

describe("ForgotPasswordScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders the forgot password page", async () => {
        await render(<ForgotPasswordScreen />);

        expect(
            screen.getByText("Forgot your password?")
        ).toBeTruthy();

        expect(
            screen.getByPlaceholderText("Email")
        ).toBeTruthy();

        expect(
            screen.getByText("Send reset email")
        ).toBeTruthy();
    });

    it("shows an error when the email is empty", async () => {
        await render(<ForgotPasswordScreen/>);

        await fireEvent.press(
            screen.getByText("Send reset email")
        );

        expect(
            await screen.findByText(
                "Please enter a valid email address."
            )
        ).toBeTruthy();

        expect(passwordResetApi).not.toHaveBeenCalled();
    });

    it("shows an error when the email is invalid", async () => {
        await render(<ForgotPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("Email"),
            "not-an-email"
        );

        await fireEvent.press(
            screen.getByText("Send reset email")
        );

        expect(
            await screen.findByText(
                "Please enter a valid email address."
            )
        ).toBeTruthy();

        expect(passwordResetApi).not.toHaveBeenCalled();
    });

    it("calls the mocked password reset API with a valid email", async () => {
        (passwordResetApi as jest.Mock).mockResolvedValue(true);

        await render(<ForgotPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("Email"),
            "test@example.com"
        );

        await fireEvent.press(
            screen.getByText("Send reset email")
        );

        await waitFor(() => {
            expect(passwordResetApi).toHaveBeenCalledWith(
                "test@example.com"
            );
        });

        expect(passwordResetApi).toHaveBeenCalledTimes(1);
    });

    it("trims whitespace from the email before calling the API", async () => {
        (passwordResetApi as jest.Mock).mockResolvedValue(true);

        await render(<ForgotPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("Email"),
            "  test@example.com  "
        );

        await fireEvent.press(
            screen.getByText("Send reset email")
        );

        await waitFor(() => {
            expect(passwordResetApi).toHaveBeenCalledWith(
                "test@example.com"
            );
        });
    });

    it("shows the success alert after a successful reset request", async () => {
        (passwordResetApi as jest.Mock).mockResolvedValue(true);

        await render(<ForgotPasswordScreen />);

        await fireEvent.changeText(
            screen.getByPlaceholderText("Email"),
            "test@example.com"
        );

        await fireEvent.press(
            screen.getByText("Send reset email")
        );

        expect(
            await screen.findByText("Check your email")
        ).toBeTruthy();

        expect(
            screen.getByText(
                "If an account exists with that email address, we’ve sent you a password reset link. Please check your inbox and follow the instructions."
            )
        ).toBeTruthy();
    });

    it("shows the API error when the mocked API rejects", async () => {
        (passwordResetApi as jest.Mock).mockRejectedValue(
            new Error("Unable to send reset email.")
        );

        await render(<ForgotPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("Email"),
            "test@example.com"
        );

        await fireEvent.press(
            screen.getByText("Send reset email")
        );

        expect(
            await screen.findByText(
                "Unable to send reset email."
            )
        ).toBeTruthy();
    });

    it("navigates back to login from the login link", async () => {
        await render(<ForgotPasswordScreen />);

        await fireEvent.press(screen.getByText("Log in"));

        expect(mockedRouter.replace).toHaveBeenCalledWith({
            pathname: "/(auth)/login",
        });
    });

    it("navigates back to login after closing the success alert", async () => {
        (passwordResetApi as jest.Mock).mockResolvedValue(true);

        await render(<ForgotPasswordScreen/>);

        await fireEvent.changeText(
            screen.getByPlaceholderText("Email"),
            "test@example.com"
        );

        await fireEvent.press(
            screen.getByText("Send reset email")
        );

        const alertButton =
            await screen.findByText("Back to login");

        await fireEvent.press(alertButton);

        expect(mockedRouter.replace).toHaveBeenCalledWith({
            pathname: "/(auth)/login",
        });
    });
});