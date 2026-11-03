import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { theme } from '../constants/autocares-theme';

export type AnimatedSplashScreenProps = {
  /**
   * Callback fired once the complete 3.5s animation and exit transition finishes.
   */
  onFinish?: () => void;
  /**
   * Optional readiness flag (e.g. Supabase session loaded).
   * If provided and still false at the 3.0s mark, the splash will hold on its
   * final frame until isReady becomes true before initiating the exit fade.
   */
  isReady?: boolean;
  /**
   * Total splash duration in milliseconds (default: 3500).
   */
  duration?: number;
};

// Aspect ratio of the official AutoCares logo (1346 x 768)
const LOGO_ASPECT_RATIO = 1346 / 768;
const PROGRESS_BAR_WIDTH = 160;

export function AnimatedSplashScreen({
  onFinish,
  isReady = true,
  duration = 3500,
}: AnimatedSplashScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Stable animation values created via useMemo (compliant with React 19 compiler & hooks linting)
  const anims = useMemo(
    () => ({
      // Phase 4 screen exit
      containerOpacity: new Animated.Value(1),
      containerScale: new Animated.Value(1),
      // Phase 1 (0 – 1000ms): Logo fade & zoom
      logoOpacity: new Animated.Value(0),
      logoScale: new Animated.Value(0.82),
      // Phase 2 (1000 – 2000ms): Title & logo bloom/pulse
      titleOpacity: new Animated.Value(0),
      titleTranslateY: new Animated.Value(22),
      glowOpacity: new Animated.Value(0),
      glowScale: new Animated.Value(0.85),
      logoPulse: new Animated.Value(1),
      // Phase 3 (2000 – 3000ms): Tagline & progress indicator
      taglineOpacity: new Animated.Value(0),
      taglineTranslateY: new Animated.Value(14),
      progressAnim: new Animated.Value(0),
      footerOpacity: new Animated.Value(0),
    }),
    []
  );

  // References for unmount cleanup and single execution guard
  const animationStarted = useRef(false);
  const onFinishCalled = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isReadyRef = useRef(isReady);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Calculate responsive logo dimensions
  const { width: windowWidth } = Dimensions.get('window');
  const logoWidth = Math.min(windowWidth * 0.56, 220);
  const logoHeight = Math.round(logoWidth / LOGO_ASPECT_RATIO);

  const useNative = Platform.OS !== 'web';

  const triggerExitAndFinish = useCallback(() => {
    if (onFinishCalled.current) return;

    // Smooth exit transition (Phase 4: 3000ms - 3500ms)
    Animated.parallel([
      Animated.timing(anims.containerOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: useNative,
      }),
      Animated.timing(anims.containerScale, {
        toValue: 1.03,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: useNative,
      }),
    ]).start(() => {
      if (!onFinishCalled.current) {
        onFinishCalled.current = true;
        onFinishRef.current?.();
      }
    });
  }, [anims.containerOpacity, anims.containerScale, useNative]);

  const triggerExitRef = useRef(triggerExitAndFinish);
  useEffect(() => {
    triggerExitRef.current = triggerExitAndFinish;
  }, [triggerExitAndFinish]);

  useEffect(() => {
    if (animationStarted.current) return;
    animationStarted.current = true;

    // Hide native Expo splash screen immediately so our animated screen takes over seamlessly
    SplashScreen.hideAsync().catch(() => {});

    // ==========================================
    // PHASE 1 (0 – 1000ms): Logo Fade-In & Zoom-In
    // ==========================================
    Animated.parallel([
      Animated.timing(anims.logoOpacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNative,
      }),
      Animated.timing(anims.logoScale, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNative,
      }),
    ]).start();

    // ==========================================
    // PHASE 2 (1000 – 2000ms): App Name & Logo Glow / Pulse
    // ==========================================
    const tPhase2 = setTimeout(() => {
      Animated.parallel([
        // App name fade-in and slide-up
        Animated.timing(anims.titleOpacity, {
          toValue: 1,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        Animated.timing(anims.titleTranslateY, {
          toValue: 0,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        // Logo radiant glow bloom
        Animated.sequence([
          Animated.parallel([
            Animated.timing(anims.glowOpacity, {
              toValue: 0.75,
              duration: 500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: useNative,
            }),
            Animated.timing(anims.glowScale, {
              toValue: 1.25,
              duration: 500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: useNative,
            }),
            // Subtle logo scale pulse
            Animated.timing(anims.logoPulse, {
              toValue: 1.04,
              duration: 500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: useNative,
            }),
          ]),
          Animated.parallel([
            Animated.timing(anims.glowOpacity, {
              toValue: 0.35,
              duration: 500,
              easing: Easing.in(Easing.ease),
              useNativeDriver: useNative,
            }),
            Animated.timing(anims.glowScale, {
              toValue: 1.12,
              duration: 500,
              easing: Easing.in(Easing.ease),
              useNativeDriver: useNative,
            }),
            Animated.timing(anims.logoPulse, {
              toValue: 1.0,
              duration: 500,
              easing: Easing.in(Easing.ease),
              useNativeDriver: useNative,
            }),
          ]),
        ]),
      ]).start();
    }, 1000);
    timers.current.push(tPhase2);

    // ==========================================
    // PHASE 3 (2000 – 3000ms): Tagline & Progress Indicator
    // ==========================================
    const tPhase3 = setTimeout(() => {
      Animated.parallel([
        // Tagline fade-in and slide-up
        Animated.timing(anims.taglineOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        Animated.timing(anims.taglineTranslateY, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        // Footer text fade-in
        Animated.timing(anims.footerOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: useNative,
        }),
        // Sleek progress bar smooth fill from 0 to 1
        Animated.timing(anims.progressAnim, {
          toValue: 1,
          duration: 1050,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: useNative,
        }),
      ]).start();
    }, 2000);
    timers.current.push(tPhase3);

    // ==========================================
    // PHASE 4 (3000 – 3500ms): Exit Transition & Finish
    // ==========================================
    const tExit = setTimeout(() => {
      if (isReadyRef.current) {
        triggerExitRef.current();
      }
    }, Math.max(duration - 500, 3000));
    timers.current.push(tExit);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [anims, duration, useNative]);

  // Handle case where readiness was waiting past 3000ms
  useEffect(() => {
    if (isReady && animationStarted.current && !onFinishCalled.current) {
      const elapsedTimeout = setTimeout(() => {
        triggerExitAndFinish();
      }, 0);
      return () => clearTimeout(elapsedTimeout);
    }
  }, [isReady, triggerExitAndFinish]);

  // Interpolate progress translateX (-PROGRESS_BAR_WIDTH to 0) for pure native driver performance
  const progressTranslateX = anims.progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-PROGRESS_BAR_WIDTH, 0],
  });

  // Dynamic styling based on light/dark mode
  const bgSurface = isDark ? '#0B1120' : '#FFFFFF';
  const textTitlePrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const progressTrackBg = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgSurface,
          opacity: anims.containerOpacity,
          transform: [{ scale: anims.containerScale }],
        },
      ]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Decorative ambient background glows */}
      <View pointerEvents="none" style={styles.ambientGlowContainer}>
        <Animated.View
          style={[
            styles.glowHalo,
            {
              width: logoWidth * 1.3,
              height: logoWidth * 1.3,
              borderRadius: (logoWidth * 1.3) / 2,
              opacity: anims.glowOpacity,
              transform: [{ scale: anims.glowScale }],
            },
          ]}
        />
      </View>

      {/* Centered Brand Presentation */}
      <View style={styles.centerContent}>
        {/* Logo Container with Scale and Pulse */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: anims.logoOpacity,
              transform: [{ scale: Animated.multiply(anims.logoScale, anims.logoPulse) }],
            },
          ]}>
          <Image
            source={require('../../assets/images/autocares-logo.png')}
            style={{ width: logoWidth, height: logoHeight }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Application Name */}
        <Animated.View
          style={[
            styles.titleWrapper,
            {
              opacity: anims.titleOpacity,
              transform: [{ translateY: anims.titleTranslateY }],
            },
          ]}>
          <Text style={[styles.appName, { color: textTitlePrimary }]}>
            Auto<Text style={styles.appNameAccent}>Cares</Text>
          </Text>
          <View style={styles.badgePill}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>ROADSIDE ASSISTANCE & CARE</Text>
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineWrapper,
            {
              opacity: anims.taglineOpacity,
              transform: [{ translateY: anims.taglineTranslateY }],
            },
          ]}>
          <Text style={[styles.tagline, { color: textMuted }]}>
            Smart Vehicle Care & On-Demand Diagnostics
          </Text>
        </Animated.View>

        {/* Minimal & Elegant Progress Bar */}
        <Animated.View
          style={[
            styles.progressContainer,
            {
              opacity: anims.taglineOpacity,
            },
          ]}>
          <View style={[styles.progressTrack, { backgroundColor: progressTrackBg }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  transform: [{ translateX: progressTranslateX }],
                },
              ]}
            />
          </View>
        </Animated.View>
      </View>

      {/* Footer minimal info */}
      <Animated.View
        style={[
          styles.footerWrapper,
          {
            opacity: anims.footerOpacity,
          },
        ]}>
        <Text style={[styles.footerText, { color: textMuted }]}>
          Fast • Reliable • Connected
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  ambientGlowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  glowHalo: {
    backgroundColor: 'rgba(56, 184, 232, 0.22)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 8,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  appNameAccent: {
    color: theme.colors.primary, // Official Sky Blue #38B8E8
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 184, 232, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 184, 232, 0.2)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.yellow, // Accent Yellow #FFD52A
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    letterSpacing: 0.8,
  },
  taglineWrapper: {
    marginTop: 14,
    paddingHorizontal: 20,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: PROGRESS_BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: PROGRESS_BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  footerWrapper: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
