// noinspection TypeScriptValidateTypes

import {View, Text, StyleSheet, TextInput, Button} from "react-native";
import {useAuth} from "@/context/AuthContext";
import {useState} from "react";
import {loginClient} from "@/api/apiClient";
import {router} from "expo-router";

export default function Login(){
    const {login} = useAuth();

    const [username, setUsername] = useState("");
    const[password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const[error, setError] = useState("");

    const goToRegister = () => {
      router.replace("/(auth)/register")
    }


    //TODO: User should be able to sign in with email instead
    const handleLogin = async () => {
        setError("")

        if(!username || !password){
            setError("Please enter your username and password");
            return;
        }

        try{
            setIsLoading(true);

            const response = await loginClient(username, password);
            login(response.token, {
                id: response.userId,
                username: response.username,
                firstName: response.firstName,
                lastName: response.lastName || null,
                email: response.email
            });

            router.replace("/(dashboard)/workspaces")
        } catch (e) {
            if(e instanceof Error){
                setError(e.message)
            } else {
                setError("Something went wrong while logging in")
            }
        } finally {
            setIsLoading(false)
        }

    }
    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Login
            </Text>

            <Text style={styles.label}>Username:</Text>
            <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <Text style={styles.label} >Password:</Text>
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {error !== "" && ( <Text style={styles.error}> {error} </Text> )}

            <Text onPress={() => goToRegister()}>Dont have an account? Go to the register page</Text>

            <Button
                title={isLoading ? "Logging in..." : "Login"}
                onPress={handleLogin}
                disabled={isLoading}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 24
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#2d2d2d",
        marginBottom: 6
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    error: {
        marginBottom: 16,
        fontSize: 14
    }
})