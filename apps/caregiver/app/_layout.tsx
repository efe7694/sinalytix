import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/store/auth';
import { registerPushToken } from '@/lib/push-notifications';

export default function RootLayout() {
  const { isAuthenticated, isLoading, profile, loadSession } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inMain = segments[0] === '(main)';

    if (!isAuthenticated && !inOnboarding) {
      router.replace('/onboarding/intro');
    } else if (isAuthenticated && !profile?.onboarding_completed_at && !inOnboarding) {
      router.replace('/onboarding/intro');
    } else if (isAuthenticated && profile?.onboarding_completed_at && !inMain) {
      router.replace('/(main)');
      registerPushToken().catch(() => {});
    }
  }, [isAuthenticated, isLoading, profile, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
