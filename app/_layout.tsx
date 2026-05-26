import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  AppState,
  BackHandler,
  Platform,
  Modal,
} from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeroUINativeProvider, Button, Card } from "heroui-native";
import * as SplashScreen from "expo-splash-screen";
import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";
import "react-native-reanimated";
import "../global.css";

import { queryClient } from "@/lib/query-client";
import {
  secureStore,
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRY_KEY,
  isTokenExpired,
  storeTokens,
  clearTokens,
} from "@/lib/secure-store";
import { authAdapter } from "@/features/auth";
import logger from "@/lib/logger";
import { useAuthStore, usePreferencesStore, useUIStore } from "@/store";
import { useRealtimeConnection } from "@/lib/realtime";
import { useRootDetection } from "@/lib/security/root-detection";
import { NoInternetScreen } from "@/components/ui/NoInternetScreen";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ServerErrorScreen } from "@/components/ui/ServerErrorScreen";
import { MaintenanceModeScreen } from "@/components/ui/MaintenanceModeScreen";
import { ForceUpdateScreen } from "@/components/ui/ForceUpdateScreen";

SplashScreen.preventAutoHideAsync();

const CONFIG_TIMEOUT_MS = 5000;

type BootPhase =
  | "checking"
  | "offline"
  | "server-error"
  | "maintenance"
  | "force-update"
  | "ready";

function isVersionBehind(appVersion: string, minVersion: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const [a1 = 0, a2 = 0, a3 = 0] = parse(appVersion);
  const [m1 = 0, m2 = 0, m3 = 0] = parse(minVersion);
  if (a1 !== m1) return a1 < m1;
  if (a2 !== m2) return a2 < m2;
  return a3 < m3;
}

// Slot always mounts so Expo Router can initialise navigation.
// The overlay covers it while auth is unresolved — no white flash.
function AuthGate() {
  const { session, isLoading: authLoading } = useAuthStore();
  const { hasSeenOnboarding, _hasHydrated } = usePreferencesStore();
  const segments = useSegments();
  const router = useRouter();

  const isLoading = authLoading || !_hasHydrated;
  const inAuthGroup = segments[0] === "(auth)";

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      if (!inAuthGroup) {
        router.replace(
          hasSeenOnboarding ? "/(auth)/sign-in" : "/(auth)/onboarding"
        );
      }
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, isLoading, hasSeenOnboarding, segments]);

  // Keep overlay up until we've actually landed on the right segment.
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

function SessionExpiredModal() {
  const { sessionExpiredModalVisible, sessionExpiredMessage, setSessionExpiredModalVisible } =
    useUIStore();
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  const handleSignInAgain = async () => {
    setSessionExpiredModalVisible(false);
    authAdapter.logout(useAuthStore.getState().token ?? "").catch(() => {});
    await clearTokens();
    queryClient.clear();
    clearAuth();
    router.replace("/(auth)/sign-in");
  };

  return (
    <Modal
      visible={sessionExpiredModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <Card style={{ margin: 24 }}>
          <Card.Header>
            <View className="gap-1">
              <Card.Title>Session Expired</Card.Title>
              <Card.Description>
                {sessionExpiredMessage ??
                  "Your session has expired. Please sign in again to continue."}
              </Card.Description>
            </View>
          </Card.Header>
          <Card.Footer className="mt-4">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onPress={handleSignInAgain}
            >
              <Button.Label>Sign in again</Button.Label>
            </Button>
          </Card.Footer>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
  },
});

function RealtimeProvider() {
  useRealtimeConnection();
  return null;
}

function RootDetectionRunner() {
  useRootDetection();
  return null;
}

export default function RootLayout() {
  const { setAuth, clearAuth } = useAuthStore();
  const {
    isOffline,
    maintenanceMessage,
    setOffline,
    setMaintenanceMode,
    setForceUpdateRequired,
    setServerErrorActive,
    setSessionExpiredModalVisible,
  } = useUIStore();

  const [bootPhase, setBootPhase] = useState<BootPhase>("checking");
  const bootPhaseRef = useRef<BootPhase>("checking");
  const lastForegroundCheck = useRef(0);

  useEffect(() => {
    bootPhaseRef.current = bootPhase;
  }, [bootPhase]);

  // Hide splash screen as soon as we have something meaningful to show
  useEffect(() => {
    if (bootPhase !== "checking") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [bootPhase]);

  const runBoot = useCallback(async () => {
    setBootPhase("checking");
    setServerErrorActive(false);
    setMaintenanceMode(false);
    setForceUpdateRequired(false);

    // Step 1: Connectivity check
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      setBootPhase("offline");
      return;
    }
    setOffline(false);

    // Steps 2–5: App config with 5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);

    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/app/config`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      // Treat 404 as no config endpoint (skip maintenance / force update checks)
      if (res.status !== 404 && !res.ok) {
        logger.error("app config fetch failed", { status: res.status });
        setServerErrorActive(true);
        setBootPhase("server-error");
        return;
      }

      if (res.ok) {
        const config = await res.json();

        if (config.maintenanceMode) {
          setMaintenanceMode(true, config.maintenanceMessage ?? null);
          setBootPhase("maintenance");
          return;
        }

        const appVersion = Constants.expoConfig?.version ?? "1.0.0";
        if (
          config.minimumVersion &&
          isVersionBehind(appVersion, config.minimumVersion)
        ) {
          setForceUpdateRequired(true);
          setBootPhase("force-update");
          return;
        }
      }
    } catch {
      clearTimeout(timeoutId);
      logger.error("app config fetch error");
      setServerErrorActive(true);
      setBootPhase("server-error");
      return;
    }

    // Step 6: Auth bootstrap with token expiry check and refresh
    try {
      const token = await secureStore.get(TOKEN_KEY);
      if (!token) {
        clearAuth();
        setBootPhase("ready");
        return;
      }

      const expiryStr = await secureStore.get(TOKEN_EXPIRY_KEY);
      const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;

      if (isTokenExpired(expiry)) {
        const refreshToken = await secureStore.get(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          await clearTokens();
          clearAuth();
          setBootPhase("ready");
          return;
        }
        try {
          const { token: newToken, refreshToken: newRefreshToken } =
            await authAdapter.refresh(refreshToken);
          await storeTokens(newToken, newRefreshToken);
          const user = await authAdapter.getSession(newToken);
          setAuth({ user }, newToken);
        } catch (error) {
          logger.error("bootstrap: refresh token exchange failed", error);
          await clearTokens();
          clearAuth();
        }
        setBootPhase("ready");
        return;
      }

      try {
        const user = await authAdapter.getSession(token);
        setAuth({ user }, token);
      } catch {
        const refreshToken = await secureStore.get(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          await clearTokens();
          clearAuth();
          setBootPhase("ready");
          return;
        }
        try {
          const { token: newToken, refreshToken: newRefreshToken } =
            await authAdapter.refresh(refreshToken);
          await storeTokens(newToken, newRefreshToken);
          const user = await authAdapter.getSession(newToken);
          setAuth({ user }, newToken);
        } catch {
          logger.error("bootstrap: refresh failed, clearing session");
          await clearTokens();
          clearAuth();
        }
      }
    } catch (error) {
      logger.error("bootstrap failed", error);
      clearAuth();
    }

    setBootPhase("ready");
  }, []);

  // Initial boot
  useEffect(() => {
    runBoot();
  }, []);

  // Mid-session NetInfo listener (ref-guarded — only active after boot)
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (bootPhaseRef.current !== "ready") return;
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setOffline(!online);
    });
    return () => unsubscribe();
  }, []);

  // Foreground resume — check token expiry and silent refresh
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState) => {
      if (nextState !== "active" || bootPhaseRef.current !== "ready") return;

      // Debounce: skip if checked less than 10s ago
      const now = Date.now();
      if (now - lastForegroundCheck.current < 10_000) return;
      lastForegroundCheck.current = now;

      const { session } = useAuthStore.getState();
      if (!session) return;

      const token = await secureStore.get(TOKEN_KEY);
      if (!token) {
        clearAuth();
        return;
      }

      const expiryStr = await secureStore.get(TOKEN_EXPIRY_KEY);
      const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
      if (!isTokenExpired(expiry)) return;

      const refreshToken = await secureStore.get(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        setSessionExpiredModalVisible(true);
        return;
      }

      try {
        const { token: newToken, refreshToken: newRefreshToken } =
          await authAdapter.refresh(refreshToken);
        await storeTokens(newToken, newRefreshToken);
        const user = await authAdapter.getSession(newToken);
        useAuthStore.getState().setAuth({ user }, newToken);
      } catch (error) {
        logger.error("foreground resume: refresh failed", error);
        setSessionExpiredModalVisible(true);
      }
    });
    return () => sub.remove();
  }, []);

  // Prevent back navigation on non-dismissable system screens (Android)
  useEffect(() => {
    if (
      Platform.OS !== "android" ||
      (bootPhase !== "maintenance" && bootPhase !== "force-update")
    )
      return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      BackHandler.exitApp();
      return true;
    });
    return () => handler.remove();
  }, [bootPhase]);

  const handleRetryFromOffline = useCallback(async () => {
    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable !== false) {
      runBoot();
    }
  }, [runBoot]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1 }}>
            <RealtimeProvider />
            <RootDetectionRunner />
            <AuthGate />
            <SessionExpiredModal />
            {bootPhase === "ready" && <OfflineBanner visible={isOffline} />}
            {bootPhase === "offline" && (
              <NoInternetScreen onRetry={handleRetryFromOffline} />
            )}
            {bootPhase === "server-error" && (
              <ServerErrorScreen onRetry={runBoot} />
            )}
            {bootPhase === "maintenance" && (
              <MaintenanceModeScreen message={maintenanceMessage} />
            )}
            {bootPhase === "force-update" && <ForceUpdateScreen />}
          </View>
        </QueryClientProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
