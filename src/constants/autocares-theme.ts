export const theme = {
  colors: {
    // Official AutoCares palette
    primary: '#38B8E8', // Sky Blue: headers, nav, links, primary buttons
    primaryDark: '#1E9DCD',
    primaryLight: '#E8F7FD',
    yellow: '#FFD52A', // Yellow: highlights, badges, key info, selected elements
    yellowDark: '#E5BF20',
    yellowLight: '#FFFBE6',
    orange: '#FF9800', // Orange: CTAs, notifications, alerts, status highlights
    orangeDark: '#E68900',
    orangeLight: '#FFF4E5',

    // Functional & semantic aliases
    accent: '#FFD52A', // Yellow
    cta: '#FF9800', // Orange
    secondary: '#E8F7FD', // Sky-blue light tint
    blue: '#38B8E8', // Sky Blue

    // Neutrals & layout
    background: '#F8FAFC', // Crisp modern light neutral background
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    text: '#0F172A', // Slate-900 for high-contrast readability
    muted: '#64748B', // Slate-500
    border: '#E2E8F0', // Slate-200
    divider: '#F1F5F9',

    // Feedback
    success: '#16A34A',
    successLight: '#DCFCE7',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    warning: '#FF9800',
    warningLight: '#FFF4E5',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    small: 10,
    medium: 16,
    large: 24,
    pill: 9999,
  },
  typography: {
    title: {
      fontSize: 24,
      fontWeight: '800' as const,
      color: '#0F172A',
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#64748B',
      lineHeight: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: '#0F172A',
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#0F172A',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: '#64748B',
    },
  },
} as const;

export type Theme = typeof theme;