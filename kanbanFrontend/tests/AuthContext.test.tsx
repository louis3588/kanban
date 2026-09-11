import {Text, TouchableOpacity, View} from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { describe, expect, test } from "@jest/globals";
import {
    AuthProvider,
    useAuth,
} from "@/app/context/AuthContext";

function TestComponent() {
    const {
        user,
        token,
        isAuthenticated,
        login,
        logout,
    } = useAuth();

    return (
        <View>
            <Text>
                {isAuthenticated ? "authenticated" : "logged out"}
            </Text>

            <Text>{user?.username ?? "no user"}</Text>

            <Text>{token ?? "no token"}</Text>

            <TouchableOpacity
                onPress={() =>
                    login("test-token", {
                        id: 1,
                        username: "testuser",
                        email: "test@example.com",
                    })
                }
            >
                <Text>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={logout}>
                <Text>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

describe("AuthContext", () => {
    test("logs a user in and logs them out", async () => {
        const {getByText} = await render(<TestComponent/>, {
            wrapper: AuthProvider,
        });

        expect(getByText("logged out")).toBeTruthy();
        expect(getByText("no user")).toBeTruthy();
        expect(getByText("no token")).toBeTruthy();

        await fireEvent.press(getByText("Login"));

        expect(getByText("authenticated")).toBeTruthy();
        expect(getByText("testuser")).toBeTruthy();
        expect(getByText("test-token")).toBeTruthy();

        await fireEvent.press(getByText("Logout"));

        expect(getByText("logged out")).toBeTruthy();
        expect(getByText("no user")).toBeTruthy();
        expect(getByText("no token")).toBeTruthy();
    });
});