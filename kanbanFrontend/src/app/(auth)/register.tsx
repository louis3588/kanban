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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [usernameFocus, setUsernameFocus] = useState(false);

  const passwordLengthValid =
    password.length >= 8 && password.length <= 48;

  const usernameLengthValid = username.length >= 5 && username.length < 50

  const passwordUppercaseValid = /[A-Z]/.test(password);

  const passwordNumberValid = /\d/.test(password);

  const passwordsMatch =
    password.length > 0 &&
    password === confirmPassword;

  const emailValid =
    email.length > 0 && email.includes("@");

  const formValid =
    username.length > 0 &&
    firstName.length > 0 &&
    lastName.length > 0 &&
    emailValid &&
    passwordLengthValid &&
    passwordUppercaseValid &&
    passwordNumberValid &&
    passwordsMatch;

  const handleRegister = async () => {
    setError("");

    if (!formValid) {
      switch (true) {
        case username.length === 0:
          setError("Please enter a username.");
          break;

        case !usernameLengthValid:
          setError("Username must be between 5 and 48 characters.");
          break;

        case firstName.length === 0:
          setError("Please enter your first name.");
          break;

        case lastName.length === 0:
          setError("Please enter your last name.");
          break;

        case !emailValid:
          setError("Please enter a valid email address.");
          break;

        case !passwordLengthValid:
          setError("Password must be between 8 and 64 characters.");
          break;

        case !passwordUppercaseValid:
          setError("Password must contain at least one uppercase letter.");
          break;

        case !passwordNumberValid:
          setError("Password must contain at least one number.");
          break;

        case !passwordsMatch:
          setError("Passwords do not match.");
          break;
      }
      return;
    }

    try {
      setIsLoading(true);

      const response = await registerApi(
        username,
        firstName,
        lastName,
        email,
        password
      );

      login(response.token, {
        id: response.userId,
        username: response.username,
        firstName: response.firstName,
        lastName: response.lastName,
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

      <Text style={styles.label}>Username:</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onFocus={() => setUsernameFocus(true)}
        onBlur={() => setUsernameFocus(false)}
        onChangeText={(text) => {
          setUsername(text);
          setError("");
        }}
        autoCapitalize="none"
      />

      {usernameFocus && (
          <View style={styles.requirements}>
            <Text
              style={
                usernameLengthValid
                  ? styles.validRequirement
                  : styles.invalidRequirement
              }
            >
              ● 5-48 characters
            </Text>
          </View>
      )}

      <Text style={styles.label}>First Name:</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        onChangeText={(text) => {
          setFirstName(text)
          setError("")
        }}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Last Name</Text>
      <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={(text) => {
            setLastName(text)
            setError("")
          }}
          autoCapitalize="words"
      />

      <Text style={styles.label}>Email</Text>
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

      <Text style={styles.label}>Password</Text>
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

      <Text style={styles.label}>Confirm Password</Text>
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
        disabled={!isLoading}
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

