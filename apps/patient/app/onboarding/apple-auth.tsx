import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { BASE_URL, ApiError } from '@/lib/api';
import { COLORS, FONT_SIZE, SPACING } from '@sinalytix/ui';

export default function AppleAuthScreen() {
  const router = useRouter();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const [error, setError] = useState('');
  const { setTokens } = useAuthStore();
  const { draft } = useOnboardingStore();

  useEffect(() => {
    handleAppleAuth();
  }, []);

  async function handleAppleAuth() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const resp = await fetch(`${BASE_URL}/api/v1/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_token: credential.identityToken,
          given_name: credential.fullName?.givenName ?? null,
          family_name: credential.fullName?.familyName ?? null,
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new ApiError(resp.status, body.detail ?? 'Apple auth failed');
      }

      const data = await resp.json();
      await setTokens(data.access_token, data.refresh_token, data.user_id);

      if (flow === 'login' || !data.is_new_user) {
        router.replace('/(main)');
        return;
      }

      // New user in onboarding — submit draft
      await submitDraft(data.access_token);
      router.replace('/onboarding/done');
    } catch (err) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        router.back();
        return;
      }
      setError(err instanceof Error ? err.message : 'Apple ile giriş başarısız.');
    }
  }

  async function submitDraft(accessToken: string) {
    await fetch(`${BASE_URL}/api/v1/auth/complete-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        language: draft.language,
        consent: draft.consent,
        emergency_contact: draft.emergency_contact,
        health_seed: draft.health_seed,
      }),
    });
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.back} onPress={() => router.back()}>
          Geri Dön
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={styles.hint}>Apple ile giriş yapılıyor…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.MD,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.LG,
  },
  hint: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary },
  errorText: { fontSize: FONT_SIZE.BODY, color: COLORS.error, textAlign: 'center' },
  back: { fontSize: FONT_SIZE.BODY, color: COLORS.primary, fontWeight: '600' },
});
