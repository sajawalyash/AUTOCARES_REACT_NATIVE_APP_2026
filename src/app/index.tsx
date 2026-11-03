import { Redirect, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AnimatedSplashScreen } from '../components/animated-splash-screen';
import { theme } from '../constants/autocares-theme';
import { roleHome, useAuth } from '../providers/auth-provider';

// Module-level flag: ensures the splash screen displays only ONCE per app launch session.
// Subsequent in-app navigations (e.g. after login/registration) skip the splash animation.
let hasShownSplash = false;

export default function Index() {
  const { session, role, isLoading } = useAuth();
  const [splashFinished, setSplashFinished] = useState(hasShownSplash);

  // Auth readiness: true when Supabase has resolved session and role
  const isAuthReady = !isLoading && (!session || Boolean(role));

  const handleSplashFinish = useCallback(() => {
    hasShownSplash = true;
    setSplashFinished(true);
  }, []);

  // Show the professional animated splash screen on app launch
  if (!splashFinished) {
    return (
      <AnimatedSplashScreen
        onFinish={handleSplashFinish}
        isReady={isAuthReady}
        duration={3500}
      />
    );
  }

  // If splash animation completed but Supabase auth is still loading (rare edge case),
  // show clean theme indicator until auth state resolves
  if (!isAuthReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}>
        <ActivityIndicator size="large" color={theme.colors.blue} />
      </View>
    );
  }

  // Unauthenticated user -> Navigate to login
  if (!session) {
    return <Redirect href="/login" />;
  }

  // Authenticated user -> Navigate to their role-specific dashboard
  return <Redirect href={roleHome(role) as Href} />;
}
