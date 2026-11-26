/**
 * AutoCares Official Theme System
 * Official Palette:
 * - Sky Blue: #38B8E8 (Primary brand: headers, navigation, links, primary buttons)
 * - Yellow: #FFD52A (Accent: highlights, badges, key info, selected elements)
 * - Orange: #FF9800 (Secondary accent: CTAs, notifications, alerts, status highlights)
 * - Adaptive Dark & Light Modes (OLED / Slate)
 */

export const lightColors = {
  // Official AutoCares palette
  primary: '#38B8E8', // Sky Blue
  primaryDark: '#1797C7',
  primaryLight: '#EBF8FD',
  primarySubtle: '#D6F1FA',

  yellow: '#FFD52A', // Yellow accent
  yellowDark: '#E5BD17',
  yellowLight: '#FFFDEB',
  yellowSubtle: '#FFF9C2',
  yellowText: '#7A5B00',

  orange: '#FF9800', // Orange CTA & notification accent
  orangeDark: '#E68900',
  orangeLight: '#FFF5E6',
  orangeSubtle: '#FFE5C2',
  orangeText: '#A35200',

  // Functional aliases
  accent: '#FFD52A',
  cta: '#FF9800',
  blue: '#38B8E8',
  secondary: '#EBF8FD',

  // Neutrals & canvas (Light, modern, professional)
  background: '#F8FAFC', // Slate-50 canvas
  surface: '#FFFFFF', // Pure white cards & modals
  surfaceSubtle: '#F1F5F9', // Slate-100 for subtle areas
  surfaceHover: '#F8FAFC',
  text: '#0F172A', // Slate-900 (High contrast WCAG AA)
  textSecondary: '#475569', // Slate-600
  muted: '#64748B', // Slate-500
  border: '#E2E8F0', // Slate-200 clean hairline borders
  borderSubtle: '#F1F5F9',
  divider: '#F1F5F9',

  // Semantic status feedback
  success: '#16A34A',
  successLight: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#FF9800',
  warningLight: '#FFF5E6',
  info: '#38B8E8',
  infoLight: '#EBF8FD',
};

export const darkColors = {
  // Official AutoCares palette (vibrant brand identity on dark canvas)
  primary: '#38B8E8', // Sky Blue
  primaryDark: '#56C5ED',
  primaryLight: '#0B293A', // Dark blue container tint
  primarySubtle: '#061925',

  yellow: '#FFD52A',
  yellowDark: '#E5BD17',
  yellowLight: '#2A2402',
  yellowSubtle: '#3E3400',
  yellowText: '#FFD52A',

  orange: '#FF9800',
  orangeDark: '#E68900',
  orangeLight: '#2E1900',
  orangeSubtle: '#432500',
  orangeText: '#FFA726',

  accent: '#FFD52A',
  cta: '#FF9800',
  blue: '#38B8E8',
  secondary: '#0B293A',

  // Dark Canvas & Surfaces (Modern OLED/Slate theme)
  background: '#0B0F19', // Deep dark slate canvas
  surface: '#151D2C', // Elevated card & modal surface
  surfaceSubtle: '#1C2638', // Subtle component background
  surfaceHover: '#233045',
  text: '#F8FAFC', // Slate-50 high contrast text
  textSecondary: '#94A3B8', // Slate-400
  muted: '#64748B', // Slate-500
  border: '#243044', // Subtle border
  borderSubtle: '#1A2332',
  divider: '#1A2332',

  // Semantic status feedback (dark mode adjusted)
  success: '#22C55E',
  successLight: '#052E16',
  danger: '#EF4444',
  dangerLight: '#3B0D0D',
  warning: '#F59E0B',
  warningLight: '#331B00',
  info: '#38B8E8',
  infoLight: '#0A2536',
};

const baseSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const baseRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 9999,
};

export function createTheme(isDark = false) {
  const colors = isDark ? darkColors : lightColors;
  return {
    isDark,
    colors,
    spacing: baseSpacing,
    radius: baseRadius,
    typography: {
      display: {
        fontSize: 28,
        fontWeight: '800' as const,
        color: colors.text,
        letterSpacing: -0.5,
        lineHeight: 34,
      },
      title: {
        fontSize: 22,
        fontWeight: '800' as const,
        color: colors.text,
        letterSpacing: -0.3,
        lineHeight: 28,
      },
      subtitle: {
        fontSize: 15,
        fontWeight: '500' as const,
        color: colors.muted,
        lineHeight: 22,
      },
      heading: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: colors.text,
        lineHeight: 24,
      },
      subheading: {
        fontSize: 15,
        fontWeight: '600' as const,
        color: colors.text,
        lineHeight: 22,
      },
      body: {
        fontSize: 14,
        fontWeight: '400' as const,
        color: colors.text,
        lineHeight: 20,
      },
      bodyMuted: {
        fontSize: 14,
        fontWeight: '400' as const,
        color: colors.muted,
        lineHeight: 20,
      },
      label: {
        fontSize: 13,
        fontWeight: '700' as const,
        color: colors.text,
        letterSpacing: 0.1,
      },
      caption: {
        fontSize: 12,
        fontWeight: '500' as const,
        color: colors.muted,
        lineHeight: 16,
      },
    },
    shadows: {
      card: {
        shadowColor: isDark ? '#000000' : '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.35 : 0.05,
        shadowRadius: 4,
        elevation: isDark ? 4 : 2,
      },
      cardElevated: {
        shadowColor: isDark ? '#000000' : '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDark ? 0.5 : 0.08,
        shadowRadius: 8,
        elevation: isDark ? 6 : 3,
      },
      primaryButton: {
        shadowColor: '#38B8E8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
      },
      orangeButton: {
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
      },
      yellowButton: {
        shadowColor: '#FFD52A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
      },
    },
    layout: {
      maxContentWidth: 720,
    },
  };
}

export const lightTheme = createTheme(false);
export const darkTheme = createTheme(true);

// Default theme exported for backward compatibility
export const theme = lightTheme;
export type Theme = typeof lightTheme;
