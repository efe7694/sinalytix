/**
 * Login screen for returning users.
 * Apple/Google auth runs inline; phone routes to onboarding/phone with flow=login.
 *
 * TODO(before-launch): Google OAuth env vars gerekiyor.
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID → Google Cloud Console → iOS OAuth Client ID
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID → Android OAuth Client ID (gerekirse)
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/store/auth';
import { BASE_URL, ApiError } from '@/lib/api';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, TOUCH_TARGET } from '@sinalytix/ui';

WebBrowser.maybeCompleteAuthSession();

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export default function LoginScreen() {
  const router = useRouter();
  const { setTokens, setDevSession } = useAuthStore();
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState('');

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'sinalytix-patient' });

  const [googleRequest, , promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
    },
    DISCOVERY,
  );

  async function handleApple() {
    setError('');
    setLoading('apple');
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
        throw new ApiError(resp.status, body.detail ?? 'Apple giriş başarısız');
      }

      const data = await resp.json();
      await setTokens(data.access_token, data.refresh_token, data.user_id);
      router.replace('/(main)');
    } catch (err) {
      if (err instanceof Error && 'code' in err && (err as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        // User cancelled — no error shown
      } else {
        setError(err instanceof Error ? err.message : 'Apple ile giriş başarısız.');
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading('google');
    try {
      const result = await promptGoogleAsync();
      if (!result || result.type !== 'success') {
        setLoading(null);
        return;
      }
      const idToken = result.params.id_token;
      if (!idToken) throw new Error('Google token alınamadı.');

      const resp = await fetch(`${BASE_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new ApiError(resp.status, body.detail ?? 'Google giriş başarısız');
      }

      const data = await resp.json();
      await setTokens(data.access_token, data.refresh_token, data.user_id);
      router.replace('/(main)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google ile giriş başarısız.');
    } finally {
      setLoading(null);
    }
  }

  function handlePhone() {
    router.push({ pathname: '/onboarding/phone', params: { flow: 'login' } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Tekrar Hoş Geldin</Text>
        <Text style={styles.subtitle}>Hesabına giriş yap.</Text>
      </View>

      <View style={styles.buttons}>
        {Platform.OS === 'ios' && (
          <AuthButton
            label="Apple ile Giriş Yap"
            iconChar="🍎"
            dark
            loading={loading === 'apple'}
            onPress={handleApple}
          />
        )}
        <AuthButton
          label="Google ile Giriş Yap"
          iconChar="G"
          loading={loading === 'google'}
          onPress={handleGoogle}
          disabled={!googleRequest}
        />
        <AuthButton
          label="Telefon Numarasıyla Giriş Yap"
          iconChar="📱"
          onPress={handlePhone}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {__DEV__ && (
        <TouchableOpacity
          style={styles.devBtn}
          onPress={async () => {
            await setDevSession();
            router.replace('/(main)');
          }}
        >
          <Text style={styles.devLabel}>🛠 Dev Girişi</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function AuthButton({
  label,
  iconChar,
  onPress,
  dark = false,
  loading = false,
  disabled = false,
}: {
  label: string;
  iconChar: string;
  onPress: () => void;
  dark?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.authBtn, dark && styles.authBtnDark, disabled && styles.authBtnDisabled]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color={dark ? '#FFF' : COLORS.primary} style={styles.authBtnIcon} />
      ) : (
        <Text style={styles.authBtnIcon}>{iconChar}</Text>
      )}
      <Text style={[styles.authBtnLabel, dark && styles.authBtnLabelDark]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.XL * 2,
    gap: SPACING.SM,
  },
  title: { fontSize: FONT_SIZE.H1, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.BODY, color: COLORS.textSecondary },
  buttons: {
    flex: 1,
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.XL,
    gap: SPACING.MD,
    justifyContent: 'center',
  },
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    minHeight: TOUCH_TARGET.PREFERRED,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.LG,
    backgroundColor: COLORS.background,
  },
  authBtnDark: { backgroundColor: '#000', borderColor: '#000' },
  authBtnDisabled: { opacity: 0.5 },
  authBtnIcon: { fontSize: 20, width: 24, textAlign: 'center' },
  authBtnLabel: { fontSize: FONT_SIZE.BODY, fontWeight: '600', color: COLORS.textPrimary },
  authBtnLabelDark: { color: '#FFF' },
  errorText: {
    fontSize: FONT_SIZE.BODY,
    color: COLORS.error,
    textAlign: 'center',
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.MD,
  },
  devBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
    marginBottom: SPACING.XL,
  },
  devLabel: { fontSize: 13, fontWeight: '600', color: '#92400E' },
});
