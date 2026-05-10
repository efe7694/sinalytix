import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth';
import { BASE_URL } from '@/lib/api';
import { registerPushToken } from '@/lib/push-notifications';
import { COLORS } from '@sinalytix/ui';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [redirect, setRedirect] = useState<string | null>(null);
  const { setTokens } = useAuthStore();

  useEffect(() => {
    init();
  }, []);

  // Navigate only after Stack is mounted (ready=true)
  useEffect(() => {
    if (ready && redirect) {
      router.replace(redirect as any);
    }
  }, [ready, redirect]);

  async function init() {
    try {
      const [access, refresh, userId] = await Promise.all([
        SecureStore.getItemAsync('auth_access_token'),
        SecureStore.getItemAsync('auth_refresh_token'),
        SecureStore.getItemAsync('auth_user_id'),
      ]);

      if (refresh && userId) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refresh }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (resp.ok) {
            const data = await resp.json();
            await setTokens(data.access_token, data.refresh_token, userId);
            setRedirect('/(main)');
            setReady(true);
            registerPushToken();
            return;
          }
          // Refresh rejected — session truly expired
          await Promise.all([
            SecureStore.deleteItemAsync('auth_access_token'),
            SecureStore.deleteItemAsync('auth_refresh_token'),
            SecureStore.deleteItemAsync('auth_user_id'),
          ]);
        } catch {
          // Network error — restore tokens optimistically
          if (access) {
            await setTokens(access, refresh, userId);
            setRedirect('/(main)');
            setReady(true);
            registerPushToken();
            return;
          }
          // No cached access token — force re-login
        }
      }

      const completed = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
      setRedirect(completed === 'true' ? '/(auth)/login' : '/onboarding/intro');
    } catch {
      // Unexpected error — send to onboarding so user isn't blocked
      setRedirect('/onboarding/intro');
    } finally {
      setReady(true);
    }
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="add-task"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Görev Ekle',
            headerTintColor: COLORS.primary,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="conversation/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false }}
        />
      </Stack>

      {!ready && (
        <View style={styles.overlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
