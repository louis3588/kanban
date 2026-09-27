import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import RegisterScreen from "../src/app/(auth)/register";
import {AuthProvider, useAuth} from "@/context/AuthContext";
import {describe, expect} from "@jest/globals";

import {registerClient} from "@/api/apiClient";


const mockLogin = jest.fn();

jest.mock("expo-router", () => ({
    router: {
        replace: jest.fn(),
    },
}));

jest.mock("../src/api/apiClient", () => ({
    registerClient: jest.fn(),
}));

jest.mock("../src/context/AuthContext", () => ({
    useAuth: jest.fn(),
}));

const mockedRegisterApi =
    registerClient as jest.MockedFunction<typeof registerClient>;

const mockedUseAuth =
    useAuth as jest.MockedFunction<typeof useAuth>;

const mockedRouter = router as jest.Mocked<typeof router>
describe("Register", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockedUseAuth.mockReturnValue({
            login: mockLogin,
        } as ReturnType<typeof useAuth>);
    });

    it("renders the registration form", async () => {
        const {
            getByText,
            getByPlaceholderText,
        } = await render(<RegisterScreen/>);

        expect(getByText("Create an account")).toBeTruthy();

        expect(getByPlaceholderText("Username")).toBeTruthy();
        expect(getByPlaceholderText("First Name")).toBeTruthy();
        expect(getByPlaceholderText("Last Name")).toBeTruthy();
        expect(getByPlaceholderText("Email")).toBeTruthy();
        expect(getByPlaceholderText("Password")).toBeTruthy();
        expect(
            getByPlaceholderText("Confirm password")
        ).toBeTruthy();

        expect(getByText("Register")).toBeTruthy();
        expect(getByText("Log in")).toBeTruthy();
    });

    it("rejects an empty registration form", async () => {
        const {getByText} = await render(<RegisterScreen/>);

        await fireEvent.press(getByText("Register"));

        expect(
            getByText("Please enter a username.")
        ).toBeTruthy();

        expect(mockedRegisterApi).not.toHaveBeenCalled();
    });

    it("rejects a username shorter than 5 characters", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen/>);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "abc"
        );

        await fireEvent.press(getByText("Register"));

        expect(
            getByText(
                "Username must be between 5 and 48 characters."
            )
        ).toBeTruthy();

        expect(mockedRegisterApi).not.toHaveBeenCalled();
    });

    it("rejects an empty first name", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen/>);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.press(getByText("Register"));

        expect(
            getByText("Please enter your first name.")
        ).toBeTruthy();

        expect(mockedRegisterApi).not.toHaveBeenCalled();
    });

    it("rejects an invalid email address", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen/>);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("First Name"),
            "Louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Email"),
            "not-an-email"
        );

        await fireEvent.press(getByText("Register"));

        expect(
            getByText("Please enter a valid email address.")
        ).toBeTruthy();

        expect(mockedRegisterApi).not.toHaveBeenCalled();
    });

    it("rejects a password that is too short", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen/>);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("First Name"),
            "Louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Email"),
            "louis@example.com"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "abc"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Confirm password"),
            "abc"
        );

        await fireEvent.press(getByText("Register"));

        expect(
            getByText(
                "Password must be between 8 and 64 characters."
            )
        ).toBeTruthy();

        expect(mockedRegisterApi).not.toHaveBeenCalled();
    });

    it("rejects a password without an uppercase letter", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen/>);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("First Name"),
            "Louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Email"),
            "louis@example.com"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "password123"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Confirm password"),
            "password123"
        );

        await fireEvent.press(getByText("Register"));

        expect(
            getByText(
                "Password must contain at least one uppercase letter."
            )
        ).toBeTruthy();

        expect(mockedRegisterApi).not.toHaveBeenCalled();
    });

    it("rejects a password without a number", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen/>);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("First Name"),
            "Louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Email"),
            "louis@example.com"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Confirm password"),
            "Password"
        );

        await fireEvent.press(getByText("Register"));

        expect(
            getByText(
                "Password must contain at least one number."
            )
        ).toBeTruthy();

        expect(mockedRegisterApi).not.toHaveBeenCalled();
    });

    it("rejects passwords that do not match", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen/>, {
            wrapper: AuthProvider
        });

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("First Name"),
            "Louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Email"),
            "louis@example.com"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password123"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Confirm password"),
            "Different123"
        );

        await fireEvent.press(getByText("Register"));

        expect(
            getByText("Passwords do not match.")
        ).toBeTruthy();

        expect(mockedRegisterApi).not.toHaveBeenCalled();
    });

    it("calls registerApi with the completed form", async () => {
        mockedRegisterApi.mockResolvedValue({
            email: "louis@example.com",
        });

        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen />);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("First Name"),
            "Louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Last Name"),
            "Polly"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Email"),
            "louis@example.com"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password123"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Confirm password"),
            "Password123"
        );

        await fireEvent.press(getByText("Register"));

        await waitFor(() => {
            expect(mockedRegisterApi).toHaveBeenCalledTimes(1);
        });

        expect(mockedRegisterApi).toHaveBeenCalledWith(
            "louis",
            "Louis",
            "Polly",
            "louis@example.com",
            "Password123"
        );
    });

    it("navigates to email confirmation after successful registration", async () => {
        mockedRegisterApi.mockResolvedValue({
            email: "louis@example.com",
        });

        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen />);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("First Name"),
            "Louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Last Name"),
            "Polly"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Email"),
            "louis@example.com"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password123"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Confirm password"),
            "Password123"
        );

        await fireEvent.press(getByText("Register"));

        await waitFor(() => {
            expect(mockedRouter.replace).toHaveBeenCalledWith({
                pathname: "/(auth)/confirm-email",
                params: {
                    email: "louis@example.com",
                },
            });
        });
    });

    it("displays the API error when registration fails", async () => {
        mockedRegisterApi.mockRejectedValue(
            new Error("Username is already taken.")
        );

        const {
            getByPlaceholderText,
            getByText,
        } = await render(<RegisterScreen />);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("First Name"),
            "Louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Last Name"),
            "Polly"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Email"),
            "louis@example.com"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password123"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Confirm password"),
            "Password123"
        );

        await fireEvent.press(getByText("Register"));

        await waitFor(() => {
            expect(
                getByText("Username is already taken.")
            ).toBeTruthy();
        });

        expect(mockedRouter.replace).not.toHaveBeenCalled();
    });

    it("navigates back to login", async () => {
        const {getByText} = await render(<RegisterScreen/>);

        await fireEvent.press(getByText("Log in"));

        expect(mockedRouter.replace).toHaveBeenCalledWith({
            pathname: "/(auth)/login",
        });
    });
});