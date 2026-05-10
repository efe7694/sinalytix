import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { BASE_URL, ApiError } from '@/lib/api';
import { COLORS, FONT_SIZE, SPACING } from '@sinalytix/ui';

// TODO(before-launch): Google OAuth env vars gerekiyor.
// Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
//   iOS client ID  → EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
//   Web client ID  → GOOGLE_CLIENT_ID (backend .env)
// Backend config: services/api/app/core/config.py → google_client_id

WebBrowser.maybeCompleteAuthSession();

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export default function GoogleAuthScreen() {
  const router = useRouter();
  const { flow } = useLocalSearchParams<{ flow?: string }>();
  const [error, setError] = useState('');
  const { setTokens } = useAuthStore();
  const { draft } = useOnboardingStore();

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'sinalytix-patient' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
    },
    DISCOVERY,
  );

  useEffect(() => {
    if (request) {
      promptAsync();
    }
  }, [request]);

  useEffect(() => {
    if (!response) return;

    if (response.type === 'cancel' || response.type === 'dismiss') {
      router.back();
      return;
    }

    if (response.type === 'error') {
      setError(response.error?.message ?? 'Google ile giriş başarısız.');
      return;
    }

    if (response.type === 'success') {
      const idToken = response.params.id_token;
      if (!idToken) {
        setError('Google token alınamadı.');
        return;
      }
      handleGoogleToken(idToken);
    }
  }, [response]);

  async function handleGoogleToken(idToken: string) {
    try {
      const resp = await fetch(`${BASE_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new ApiError(resp.status, body.detail ?? 'Google auth failed');
      }

      const data = await resp.json();
      await setTokens(data.access_token, data.refresh_token, data.user_id);

      if (flow === 'login' || !data.is_new_user) {
        router.replace('/(main)');
        return;
      }

      await submitDraft(data.access_token);
      router.replace('/onboarding/done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google ile giriş başarısız.');
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
      <Text style={styles.hint}>Google ile giriş yapılıyor…</Text>
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
