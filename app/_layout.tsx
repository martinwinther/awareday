import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthUser } from "@/src/lib/firebase/auth";
import { colors } from "@/src/theme/colors";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "sign-in";

    if (!user && !inAuthGroup) {
      router.replace("/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="sign-in"
          options={{
            presentation: "fullScreenModal",
            animation: "fade",
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
