export const theme = {
  colors: {
    background: '#F6F7FB',
    surface: '#FFFFFF',
    primary: '#111827',
    primaryText: '#FFFFFF',
    secondary: '#6D5CE7',
    secondaryText: '#FFFFFF',
    accent: '#06B6D4',
    muted: '#6B7280',
    border: '#E6E8EF',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    tabActive: '#111827',
    tabInactive: '#9CA3AF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
  },
};

export type Theme = typeof theme;

