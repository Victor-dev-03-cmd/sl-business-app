export const Colors = {
  light: {
    // Background colors
    background: '#F9FAFB',
    surface: '#FFFFFF',
    card: '#FFFFFF',

    // Text colors
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
    },

    // Brand colors
    brand: {
      dark: '#053765',
      blue: '#2a7db4',
      gold: '#dfb85d',
      sand: '#dfb85d',
    },

    // UI colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    divider: '#F3F4F6',

    // Status colors
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Semantic colors
    input: {
      background: '#F9FAFB',
      border: '#E5E7EB',
      text: '#111827',
      placeholder: '#9CA3AF',
    },

    shadow: {
      color: '#000000',
      opacity: 0.1,
    },
  },

  dark: {
    // Background colors
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',

    // Text colors
    text: {
      primary: '#F1F5F9',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
      inverse: '#0F172A',
    },

    // Brand colors
    brand: {
      dark: '#3B82F6',
      blue: '#60A5FA',
      gold: '#FCD34D',
      sand: '#FCD34D',
    },

    // UI colors
    border: '#334155',
    borderLight: '#475569',
    divider: '#334155',

    // Status colors
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',

    // Semantic colors
    input: {
      background: '#1E293B',
      border: '#334155',
      text: '#F1F5F9',
      placeholder: '#64748B',
    },

    shadow: {
      color: '#000000',
      opacity: 0.4,
    },
  },
};

export type Theme = typeof Colors.light;
