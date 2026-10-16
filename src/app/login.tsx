import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AutoCaresLogo from '../components/autocares-logo';
import { theme } from '../constants/autocares-theme';
import { replace } from '../lib/nav';
import { useAuth } from '../providers/auth-provider';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password to continue.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      const msg =
        error === 'Invalid login credentials'
          ? 'Invalid email or password. If you do not have an account yet, tap Register below.'
          : error;
      Alert.alert('Login failed', msg);
      return;
    }

    replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          {/* Logo & Brand Header */}
          <View style={styles.logoWrapper}>
            <AutoCaresLogo size="hero" />
            <View style={styles.accentBadge}>
              <Text style={styles.accentBadgeText}>ROADSIDE ASSISTANCE</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to access on-demand vehicle support</Text>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={theme.colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              editable={!isSubmitting}
            />
          </View>

          {/* Primary Action Button (Sky Blue) */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              isSubmitting && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogin}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <Text style={styles.bottomText}>{"Don't have an account? "}</Text>
            <Link href="/register" asChild>
              <Pressable>
                <Text style={styles.link}>Register here</Text>
              </Pressable>
            </Link>
          </View>

          <Link href="/" asChild>
            <Pressable style={styles.backWrapper}>
              <Text style={styles.back}>Back to Home</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 24,
    paddingVertical: 32,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    ...theme.shadows.cardElevated,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  accentBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
  },
  accentBadgeText: {
    color: theme.colors.yellowText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: theme.colors.primary, // Sky Blue #38B8E8
    borderRadius: theme.radius.md,
    minHeight: 50,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...theme.shadows.primaryButton,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  bottomText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  link: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
    fontSize: 14,
  },
  backWrapper: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  back: {
    color: theme.colors.muted,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
});
