jest.mock("@react-native-async-storage/async-storage", () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
import {act, fireEvent, render, waitFor} from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, useAuth, userToJson, jsonToUser } from "@/context/AuthContext";
import { Text, Pressable } from "react-native";

const testUser = {
    id: 1,
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
};

function AuthConsumer() {
    const { user, token, isAuthenticated, isLoading, login, logout } = useAuth();

    return (
        <>
            <Text testID="loading">{String(isLoading)}</Text>
            <Text testID="authenticated">{String(isAuthenticated)}</Text>
            <Text testID="token">{token ?? "no-token"}</Text>
            <Text testID="user">{user?.username ?? "no-user"}</Text>

            <Pressable
                testID="login"
                onPress={() => login("test-token", testUser)}
            >
                <Text>Log in</Text>
            </Pressable>

            <Pressable testID="logout" onPress={logout}>
                <Text>Log out</Text>
            </Pressable>
        </>
    );
}

describe("AuthContext", () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
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
            expect(getByTestId("loading").props.children).toBe("false");
        });

        expect(getByTestId("authenticated").props.children).toBe("false");
        expect(getByTestId("token").props.children).toBe("no-token");
        expect(getByTestId("user").props.children).toBe("no-user");
    });

    it("saves the session when logging in", async () => {
        const { getByTestId } = await render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(getByTestId("loading").props.children).toBe("false");
        });

        await act(async () => {
            await fireEvent.press(getByTestId("login"));
        });

        await waitFor(() => {
            expect(getByTestId("authenticated").props.children).toBe("true");
        });

        expect(getByTestId("token").props.children).toBe("test-token");
        expect(getByTestId("user").props.children).toBe("testuser");

        await waitFor(async () => {
            expect(await AsyncStorage.getItem("token")).toBe("test-token");
            expect(await AsyncStorage.getItem("user")).toBe(userToJson(testUser));
        });
    });

    it("clears the session when logging out", async () => {
        await AsyncStorage.setItem("token", "test-token");
        await AsyncStorage.setItem("user", userToJson(testUser));

        const { getByTestId } = await render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(getByTestId("authenticated").props.children).toBe("true");
        });

        await act(async () => {
            await fireEvent.press(getByTestId("logout"));
        });

        await waitFor(() => {
            expect(getByTestId("authenticated").props.children).toBe("false");
        });

        await waitFor(async () => {
            expect(await AsyncStorage.getItem("token")).toBeNull();
            expect(await AsyncStorage.getItem("user")).toBeNull();
        });
    });

    it("restores a saved session", async () => {
        await AsyncStorage.setItem("token", "saved-token");
        await AsyncStorage.setItem("user", userToJson(testUser));

        const { getByTestId } = await render(
            <AuthProvider>
                <AuthConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(getByTestId("loading").props.children).toBe("false");
        });

        expect(getByTestId("authenticated").props.children).toBe("true");
        expect(getByTestId("token").props.children).toBe("saved-token");
        expect(getByTestId("user").props.children).toBe("testuser");
    });
});