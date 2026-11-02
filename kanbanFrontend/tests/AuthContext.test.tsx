jest.mock("@react-native-async-storage/async-storage", () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import React from "react";
import { Pressable, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    act,
    fireEvent,
    render,
    waitFor,
} from "@testing-library/react-native";

import {
    AuthProvider,
    useAuth,
    userToJson,
    jsonToUser,
} from "@/context/AuthContext";

import {
    getConnection,
    stopConnection,
} from "@/client/signalr/hubClient";

jest.mock("@/client/signalr/hubClient", () => ({
    __esModule: true,
    getConnection: jest.fn(),
    stopConnection: jest.fn(),
}));

const mockGetConnection = jest.mocked(getConnection);
const mockStopConnection = jest.mocked(stopConnection);


const mockInvoke = jest.fn();

const mockConnection = {
    invoke: mockInvoke,
    on: jest.fn(),
    off: jest.fn(),
    onclose: jest.fn(),
    onreconnecting: jest.fn(),
    onreconnected: jest.fn(),
    start: jest.fn(async () => {}),
    stop: jest.fn(async () => {}),
    state: "Connected",
};

const testUser = {
    id: 1,
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
};

const testPreferences = {
    theme: "SepiaLight",
    defaultBoardId: null,
    showOnlineStatus: true,
    enableEmailNotifications: true,
    profile: {
        ...testUser,
        profileImage: null,
        bio: null,
    },
};

function AuthConsumer() {
    const {
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
    } = useAuth();

    return (
        <>
            <Text testID="loading">
                {String(isLoading)}
            </Text>

            <Text testID="authenticated">
                {String(isAuthenticated)}
            </Text>

            <Text testID="token">
                {token ?? "no-token"}
            </Text>

            <Text testID="user">
                {user?.username ?? "no-user"}
            </Text>

            <Pressable
                testID="login"
                onPress={() => login("test-token", testUser)}
            >
                <Text>Log in</Text>
            </Pressable>

            <Pressable
                testID="logout"
                onPress={logout}
            >
                <Text>Log out</Text>
            </Pressable>
        </>
    );
}

describe("AuthContext", () => {
    beforeEach(async () => {
        jest.clearAllMocks();

        await AsyncStorage.clear();

        mockGetConnection.mockImplementation(
            async () =>
                mockConnection as unknown as Awaited<
                    ReturnType<typeof getConnection>
                >
        );

        mockInvoke.mockImplementation(
            async () => testPreferences
        );

        mockStopConnection.mockImplementation(async () => {});
    });

    it("serialises and parses a user", () => {
        const json = userToJson(testUser);

        expect(jsonToUser(json)).toEqual(testUser);
    });

    it("starts unauthenticated and finishes loading", async () => {
        const { getByTestId } = await render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(
                getByTestId("loading").props.children
            ).toBe("false");
        });

        expect(
            getByTestId("authenticated").props.children
        ).toBe("false");

        expect(
            getByTestId("token").props.children
        ).toBe("no-token");

        expect(
            getByTestId("user").props.children
        ).toBe("no-user");

        expect(mockGetConnection).not.toHaveBeenCalled();
    });

    it("saves the session when logging in", async () => {
        const { getByTestId } = await render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(
                getByTestId("loading").props.children
            ).toBe("false");
        });

        await fireEvent.press(getByTestId("login"));

        await waitFor(() => {
            expect(
                getByTestId("authenticated").props.children
            ).toBe("true");
        });

        expect(
            getByTestId("token").props.children
        ).toBe("test-token");

        expect(
            getByTestId("user").props.children
        ).toBe("testuser");

        await waitFor(async () => {
            expect(
                await AsyncStorage.getItem("token")
            ).toBe("test-token");

            expect(
                await AsyncStorage.getItem("user")
            ).toBe(userToJson(testUser));
        });

        await waitFor(() => {
            expect(mockGetConnection).toHaveBeenCalled();
        });

        expect(mockGetConnection).toHaveBeenCalledWith(
            "test-token"
        );
    });

    it("clears the session when logging out", async () => {
        await AsyncStorage.setItem("token", "test-token");
        await AsyncStorage.setItem(
            "user",
            userToJson(testUser)
        );

        const { getByTestId } = await render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(
                getByTestId("authenticated").props.children
            ).toBe("true");
        });

        await fireEvent.press(getByTestId("logout"));

        await waitFor(() => {
            expect(
                getByTestId("authenticated").props.children
            ).toBe("false");
        });

        await waitFor(async () => {
            expect(
                await AsyncStorage.getItem("token")
            ).toBeNull();

            expect(
                await AsyncStorage.getItem("user")
            ).toBeNull();
        });

        expect(mockStopConnection).toHaveBeenCalled();
    });

    it("restores a saved session", async () => {
        await AsyncStorage.setItem(
            "token",
            "saved-token"
        );

        await AsyncStorage.setItem(
            "user",
            userToJson(testUser)
        );

        const { getByTestId } = await render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(
                getByTestId("loading").props.children
            ).toBe("false");
        });

        expect(
            getByTestId("authenticated").props.children
        ).toBe("true");

        expect(
            getByTestId("token").props.children
        ).toBe("saved-token");

        expect(
            getByTestId("user").props.children
        ).toBe("testuser");

        await waitFor(() => {
            expect(mockGetConnection).toHaveBeenCalledWith(
                "saved-token"
            );
        });
    });
});