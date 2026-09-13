import { useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { registerClient as registerApi } from "../../api/apiClient";
import {useAuth} from "@/app/context/AuthContext";

export default function RegisterScreen() {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordLengthValid =
    password.length >= 8 && password.length <= 64;

  const passwordUppercaseValid = /[A-Z]/.test(password);

  const passwordNumberValid = /\d/.test(password);

  const passwordsMatch =
    password.length > 0 &&
    password === confirmPassword;

  const emailValid =
    email.length > 0 && email.includes("@");

  const formValid =
    username.length > 0 &&
    emailValid &&
    passwordLengthValid &&
    passwordUppercaseValid &&
    passwordNumberValid &&
    passwordsMatch;

  const handleRegister = async () => {
    setError("");

    if (!formValid) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await registerApi(
        username,
        email,
        password
      );

      login(response.token, {
        id: response.userId,
        username: response.username,
        email: response.email,
      });

      router.replace("/(app)/workspaces");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          "Something went wrong while creating your account."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          setError("");
        }}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError("");
        }}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onFocus={() => setPasswordFocused(true)}
        onChangeText={(text) => {
          setPassword(text);
          setError("");
        }}
        secureTextEntry
      />

      {passwordFocused && (
        <View style={styles.requirements}>
          <Text
            style={
              passwordLengthValid
                ? styles.validRequirement
                : styles.invalidRequirement
            }
          >
            ● 8–64 characters
          </Text>

          <Text
            style={
              passwordUppercaseValid
                ? styles.validRequirement
                : styles.invalidRequirement
            }
          >
            ● At least one uppercase letter
          </Text>

          <Text
            style={
              passwordNumberValid
                ? styles.validRequirement
                : styles.invalidRequirement
            }
          >
            ● At least one number
          </Text>

          <Text
            style={
              passwordsMatch
                ? styles.validRequirement
                : styles.invalidRequirement
            }
          >
            ● Passwords match
          </Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setError("");
        }}
        secureTextEntry
      />

      {error !== "" && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      <Button
        title={
          isLoading
            ? "Creating account..."
            : "Register"
        }
        onPress={handleRegister}
        disabled={!formValid || isLoading}
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
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  requirements: {
    marginTop: -8,
    marginBottom: 16,
  },
  validRequirement: {
    color: "green",
    marginBottom: 4,
  },
  invalidRequirement: {
    color: "red",
    marginBottom: 4,
  },
  error: {
    marginBottom: 16,
    fontSize: 14,
  },
});

