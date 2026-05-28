import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { getTextStyles } from '../utils/fontHelpers';

interface LocalizedTextProps extends TextProps {
  bold?: boolean;
  semiBold?: boolean;
}

export const LocalizedText: React.FC<LocalizedTextProps> = ({
  style,
  bold = false,
  semiBold = false,
  children,
  ...props
}) => {
  const { language } = useLanguage();

  // Determine if text should be bold
  const isBold = bold || semiBold;

  // Get language-specific text styles
  const languageStyles = getTextStyles(language, isBold);

  // Merge styles
  const combinedStyles = StyleSheet.flatten([
    languageStyles,
    style,
  ]);

  return (
    <Text style={combinedStyles} {...props}>
      {children}
    </Text>
  );
};
