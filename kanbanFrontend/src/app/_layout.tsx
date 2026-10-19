import { Stack } from "expo-router";
import {AuthProvider} from "@/context/AuthContext";
import "../../global.css"
import {useEffect} from "react";
import {healthCheck} from "@/client/api/apiClient";

export default function RootLayout() {

    useEffect(() => {
        const wakeBackend = async () => {
            try {
                await fetch(healthCheck);
            } catch {
                //supposed to fail on command to wake up the backend
            }
        };

        wakeBackend();
    }, []);
  return (
      <AuthProvider>
          <Stack>
              <Stack.Screen
                  name="(auth)"
                  options={{
                      headerShown: false,
                  }}
              />

              <Stack.Screen
                  name="(dashboard)"
                  options={{
                      headerShown: false,
                  }}
              />
          </Stack>
      </AuthProvider>
  );
}
