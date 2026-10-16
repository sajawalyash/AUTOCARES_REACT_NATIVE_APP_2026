/**
 * AutoCares Official Theme
 * Official Palette:
 * - Sky Blue: #38B8E8 (Primary brand: headers, navigation, links, primary buttons)
 * - Yellow: #FFD52A (Accent: highlights, badges, key info, selected elements)
 * - Orange: #FF9800 (Secondary accent: CTAs, notifications, alerts, status highlights)
 */

export const theme = {
  colors: {
    // Official AutoCares palette
    primary: '#38B8E8', // Sky Blue
    primaryDark: '#1797C7',
    primaryLight: '#EBF8FD',
    primarySubtle: '#D6F1FA',

    yellow: '#FFD52A', // Yellow accent
    yellowDark: '#E5BD17',
    yellowLight: '#FFFDEB',
    yellowSubtle: '#FFF9C2',
    yellowText: '#7A5B00', // High-contrast accessible text for yellow surfaces

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
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 9999,
  },
  typography: {
    display: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: '#0F172A',
      letterSpacing: -0.5,
      lineHeight: 34,
    },
    title: {
      fontSize: 22,
      fontWeight: '800' as const,
      color: '#0F172A',
      letterSpacing: -0.3,
      lineHeight: 28,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '500' as const,
      color: '#64748B',
      lineHeight: 22,
    },
    heading: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: '#0F172A',
      lineHeight: 24,
    },
    subheading: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#0F172A',
      lineHeight: 22,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#0F172A',
      lineHeight: 20,
    },
    bodyMuted: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#64748B',
      lineHeight: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: '#0F172A',
      letterSpacing: 0.1,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: '#64748B',
      lineHeight: 16,
    },
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardElevated: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
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
} as const;

export type Theme = typeof theme;