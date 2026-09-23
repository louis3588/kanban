import { StyleSheet, Text, View, Button } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function ConfirmEmailScreen() {
    const { email } = useLocalSearchParams<{
        email: string;
    }>();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Check your email
            </Text>

            <Text style={styles.message}>
                We've sent a confirmation link to:
            </Text>

            <Text style={styles.email}>
                {email}
            </Text>

            <Text style={styles.message}>
                Click the link in the email to confirm your account.
            </Text>

            <Button
                title="Back to login"
                onPress={() => router.replace("/login")}
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
        marginBottom: 12,
    },

    email: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 12,
    },
});