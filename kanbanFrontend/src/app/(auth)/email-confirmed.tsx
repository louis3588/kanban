import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Button,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { confirmEmail } from "@/api/apiClient";
import { useAuth} from "@/app/context/AuthContext";

export default function EmailConfirmedScreen() {
    const { login } = useAuth();

    const { userId, token } = useLocalSearchParams<{
        userId: string;
        token: string;
    }>();

    const [error, setError] = useState("");
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        const confirm = async () => {
            if (!userId || !token) {
                setError("Invalid confirmation link.");
                return;
            }

            try {
                const response = await confirmEmail(
                    Number(userId),
                    token
                );

                login(response.token, {
                    id: response.userId,
                    username: response.username,
                    firstName: response.firstName,
                    lastName: response.lastName || null,
                    email: response.email
                });

                setConfirmed(true);
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError(
                        "Something went wrong while confirming your email."
                    );
                }
            }
        };

        confirm();
    }, [userId, token]);

    if (!confirmed && !error) {
        return (
            <View style={styles.container}>
                <ActivityIndicator />

                <Text style={styles.message}>
                    Confirming your email...
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>
                    Email confirmation failed
                </Text>

                <Text style={styles.message}>
                    {error}
                </Text>

                <Button
                    title="Back to login"
                    onPress={() => router.replace("/login")}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Your email has been confirmed
            </Text>

            <Text style={styles.message}>
                Your account is ready. You can set up your profile now,
                or skip this step and do it later.
            </Text>

            <Button
                title="Set up profile"
                //TODO: Set up profile page
            />

            <Button
                title="Skip for now"
                onPress={() =>
                    router.replace("/(app)/workspaces")
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },

    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 16,
    },

    message: {
        fontSize: 16,
        marginBottom: 24,
    },
});