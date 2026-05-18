import { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeroUINativeProvider } from "heroui-native";
import * as SecureStore from "expo-secure-store";
import "react-native-reanimated";
import "../global.css";

import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";

const TOKEN_KEY = "auth_token";

// Slot always mounts so Expo Router can initialise navigation.
// The overlay covers it while auth is unresolved — no white flash.
function AuthGate() {
  const { session, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  const inAuthGroup = segments[0] === "(auth)";

  useEffect(() => {
    if (isLoading) return;
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, isLoading, segments]);

  // Keep overlay up until we've actually landed on the right segment.
  // Hiding it only when isLoading flips leaves a frame where Slot shows
  // the wrong route before the replace() completes.
  const showOverlay =
    isLoading ||
    (!isLoading && !session && !inAuthGroup) ||
    (!isLoading && !!session && inAuthGroup);

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {showOverlay && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function RootLayout() {
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    async function bootstrap() {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        clearAuth();
        return;
      }

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/get-session`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        clearAuth();
        return;
      }

      const { user } = await res.json();
      setAuth({ user }, token);
    }

    bootstrap();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        <QueryClientProvider client={queryClient}>
          <AuthGate />
        </QueryClientProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
