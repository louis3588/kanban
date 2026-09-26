import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import Login from "../src/app/(auth)/login";
import { loginClient } from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";
import {router} from "expo-router";

const mockReplace = jest.fn();
const mockLogin = jest.fn();

jest.mock("expo-router", () => ({
    router: {
        replace: jest.fn(),
    },
}));
jest.mock("../src/api/apiClient", () => ({
    loginClient: jest.fn(),
}));

jest.mock("../src/context/AuthContext", () => ({
    useAuth: jest.fn(),
}));

const mockedLoginClient = loginClient as jest.MockedFunction<typeof loginClient>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedRouter = router as jest.Mocked<typeof router>
describe("Login", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockedUseAuth.mockReturnValue({
            login: mockLogin,
        } as ReturnType<typeof useAuth>);
    });

    it("renders the login form", async () => {
        const {getByText, getByPlaceholderText} = await render(<Login/>);

        expect(getByText("Welcome back")).toBeTruthy();
        expect(
            getByText("Log in to continue to your workspace.")
        ).toBeTruthy();

        expect(getByPlaceholderText("Username")).toBeTruthy();
        expect(getByPlaceholderText("Password")).toBeTruthy();

        expect(getByText("Login")).toBeTruthy();
        expect(getByText("Create one")).toBeTruthy();
    });

    it("shows an error when username and password are empty", async () => {
        const { getByText } = await render(<Login />);

        await fireEvent.press(getByText("Login"));

        expect(
            getByText("Please enter your username and password")
        ).toBeTruthy();

        expect(mockedLoginClient).not.toHaveBeenCalled();
    });

    it("shows an error when only the username is provided", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<Login/>);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.press(getByText("Login"));

        expect(
            getByText("Please enter your username and password")
        ).toBeTruthy();

        expect(mockedLoginClient).not.toHaveBeenCalled();
    });

    it("shows an error when only the password is provided", async () => {
        const {
            getByPlaceholderText,
            getByText,
        } = await render(<Login/>);

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password123"
        );

        await fireEvent.press(getByText("Login"));

        expect(
            getByText("Please enter your username and password")
        ).toBeTruthy();

        expect(mockedLoginClient).not.toHaveBeenCalled();
    });

    it("calls the mocked login API with the entered credentials", async () => {
        mockedLoginClient.mockResolvedValue({
            token: "test-token",
            userId: 1,
            username: "louis",
            firstName: "Louis",
            lastName: "Polly",
            email: "louis@example.com",
        });

        const {
            getByPlaceholderText,
            getByText,
        } = await render(<Login />);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password123"
        );

        await fireEvent.press(getByText("Login"));

        await waitFor(() => {
            expect(mockedLoginClient).toHaveBeenCalledTimes(1);
        });

        expect(mockedLoginClient).toHaveBeenCalledWith(
            "louis",
            "Password123"
        );
    });

    it("stores the returned user through AuthContext after successful login", async () => {
        mockedLoginClient.mockResolvedValue({
            token: "test-token",
            userId: 1,
            username: "louis",
            firstName: "Louis",
            lastName: "Polly",
            email: "louis@example.com",
        });

        const {
            getByPlaceholderText,
            getByText,
        } = await render(<Login />);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password123"
        );

        await fireEvent.press(getByText("Login"));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledTimes(1);
        });

        expect(mockLogin).toHaveBeenCalledWith(
            "test-token",
            {
                id: 1,
                username: "louis",
                firstName: "Louis",
                lastName: "Polly",
                email: "louis@example.com",
            }
        );
    });

    it("navigates to the workspaces page after successful login", async () => {
        mockedLoginClient.mockResolvedValue({
            token: "test-token",
            userId: 1,
            username: "louis",
            firstName: "Louis",
            lastName: "Polly",
            email: "louis@example.com",
        });

        const {
            getByPlaceholderText,
            getByText,
        } = await render(<Login />);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "Password123"
        );

        await fireEvent.press(getByText("Login"));

        await waitFor(() => {
            expect(mockedRouter.replace).toHaveBeenCalledWith(
                "/(dashboard)/workspaces"
            );
        });
    });

    it("displays an API error when login fails", async () => {
        mockedLoginClient.mockRejectedValue(
            new Error("Invalid username or password")
        );

        const {
            getByPlaceholderText,
            getByText,
        } = await render(<Login />);

        await fireEvent.changeText(
            getByPlaceholderText("Username"),
            "louis"
        );

        await fireEvent.changeText(
            getByPlaceholderText("Password"),
            "WrongPassword"
        );

        await fireEvent.press(getByText("Login"));

        await waitFor(() => {
            expect(
                getByText("Invalid username or password")
            ).toBeTruthy();
        });

        expect(mockReplace).not.toHaveBeenCalled();
        expect(mockLogin).not.toHaveBeenCalled();
    });

    it("navigates to register when Create one is pressed", async () => {
        const {getByText} = await render(<Login/>);

        await fireEvent.press(getByText("Create one"));

        expect(mockedRouter.replace).toHaveBeenCalledWith(
            "/(auth)/register"
        );
    });
});