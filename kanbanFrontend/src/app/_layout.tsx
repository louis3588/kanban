import { Stack } from "expo-router";
import {AuthProvider} from "@/app/context/AuthContext";

export default function RootLayout() {
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
                  name="(dashbaord)"
                  options={{
                      headerShown: false,
                  }}
              />
          </Stack>
      </AuthProvider>
  );
}
