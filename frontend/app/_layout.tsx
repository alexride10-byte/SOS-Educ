import { Stack } from "expo-router";
import { ActivityIndicator, LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Archivo_800ExtraBold } from "@expo-google-fonts/archivo/800ExtraBold";
import { Archivo_900Black } from "@expo-google-fonts/archivo/900Black";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { seedIfNeeded } from "@/src/lib/seed";
import { AppLockProvider } from "@/src/lib/app-lock";
import { ChildColorsProvider } from "@/src/lib/child-colors";
import { setupNotifications } from "@/src/lib/notifications";
import { NotificationActions } from "@/src/lib/notification-actions";
import { ThemeProvider, useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

function ThemedStack({ ready }: { ready: boolean }) {
  const { scheme, colors } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {ready ? (
        <>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
          <NotificationActions />
        </>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  const [dataReady, setReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({ Archivo_800ExtraBold, Archivo_900Black });
  const ready = dataReady && (fontsLoaded || !!fontError);
  useEffect(() => {
    setupNotifications();
    seedIfNeeded()
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppLockProvider>
              <ChildColorsProvider>
                <ThemedStack ready={ready} />
              </ChildColorsProvider>
            </AppLockProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
