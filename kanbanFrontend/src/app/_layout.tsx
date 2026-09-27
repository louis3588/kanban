import { Stack } from "expo-router";
import {AuthProvider} from "@/context/AuthContext";
import "../../global.css"
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
                  name="(dashboard)"
                  options={{
                      headerShown: false,
                  }}
              />
          </Stack>
      </AuthProvider>
  );
}
