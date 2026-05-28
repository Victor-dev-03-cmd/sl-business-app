/**
 * Font helpers for handling Sinhala and Tamil text rendering
 */

export const getFontWeight = (language: 'en' | 'si' | 'ta', isBold: boolean = false): any => {
  // Tamil and Sinhala fonts render heavier than English, so we reduce the weight
  if (language === 'ta' || language === 'si') {
    if (isBold) {
      return '600'; // SemiBold instead of Bold for Tamil/Sinhala
    }
    return '400'; // Regular weight
  }

  // English uses normal font weights
  if (isBold) {
    return '700'; // Bold for English
  }
  return '400'; // Regular
};

export const getTextStyles = (language: 'en' | 'si' | 'ta', isBold: boolean = false) => {
  const baseStyles = {
    fontFamily: 'Outfit',
  };

  // Adjust font weight for Tamil and Sinhala
  if (language === 'ta' || language === 'si') {
    return {
      ...baseStyles,
      fontWeight: isBold ? '500' as any : '400' as any, // Medium instead of Bold
      letterSpacing: 0, // Remove letter spacing for better readability
    };
  }

  // English normal styling
  return {
    ...baseStyles,
    fontWeight: isBold ? '700' as any : '400' as any,
  };
};

export const getHeaderFontSize = (language: 'en' | 'si' | 'ta', baseFontSize: number): number => {
  // Tamil characters are visually larger, so we slightly reduce the font size
  if (language === 'ta') {
    return baseFontSize * 0.95;
  }

  // Sinhala is fine at normal size
  if (language === 'si') {
    return baseFontSize;
  }

  return baseFontSize;
};
