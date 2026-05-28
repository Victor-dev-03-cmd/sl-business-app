import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../../context/LanguageContext';

interface Language {
  code: 'en' | 'si' | 'ta';
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧'
  },
  {
    code: 'si',
    name: 'Sinhala',
    nativeName: 'සිංහල',
    flag: '🇱🇰'
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇱🇰'
  }
];

export const LanguageScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { language: currentLanguage, setLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const handleLanguageSelect = async (languageCode: 'en' | 'si' | 'ta') => {
    try {
      await setLanguage(languageCode);
      setSelectedLanguage(languageCode);

      Alert.alert(
        'Language Changed',
        'The app language has been updated successfully.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('Error saving language preference:', error);
      Alert.alert('Error', 'Failed to save language preference');
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b" style={{ backgroundColor: colors.surface, borderBottomColor: colors.border }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-4 p-2 rounded-full"
          style={{ backgroundColor: colors.input.background }}
        >
          <ChevronLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="text-xl font-bold font-outfit" style={{ color: colors.text.primary }}>
          Language / භාෂාව / மொழி
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View className="rounded-[24px] p-4 mb-6" style={{ backgroundColor: colors.brand.blue + '10', borderWidth: 1, borderColor: colors.brand.blue + '30' }}>
          <Text className="text-sm font-outfit leading-relaxed" style={{ color: colors.brand.blue }}>
            Select your preferred language. The app will display content in the selected language.
          </Text>
        </View>

        {/* Language Options */}
        <View className="rounded-[24px] overflow-hidden" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          {LANGUAGES.map((language, index) => (
            <TouchableOpacity
              key={language.code}
              onPress={() => handleLanguageSelect(language.code)}
              className="flex-row items-center justify-between p-5"
              style={{
                borderBottomWidth: index < LANGUAGES.length - 1 ? 1 : 0,
                borderBottomColor: colors.border
              }}
            >
              <View className="flex-row items-center flex-1">
                {/* Flag */}
                <Text className="text-3xl mr-4">{language.flag}</Text>

                {/* Language Names */}
                <View className="flex-1">
                  <Text className="text-base font-bold font-outfit mb-0.5" style={{ color: colors.text.primary }}>
                    {language.name}
                  </Text>
                  <Text className="text-sm font-outfit" style={{ color: colors.text.secondary }}>
                    {language.nativeName}
                  </Text>
                </View>
              </View>

              {/* Selected Indicator */}
              {selectedLanguage === language.code && (
                <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: colors.brand.blue }}>
                  <Check size={14} color={colors.text.inverse} strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Additional Info */}
        <View className="mt-6 rounded-[24px] p-5" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text className="text-xs font-bold uppercase tracking-widest font-outfit mb-3" style={{ color: colors.text.tertiary }}>
            About Language Support
          </Text>

          <View className="mb-3">
            <Text className="text-sm font-bold font-outfit mb-1" style={{ color: colors.text.primary }}>
              🇬🇧 English
            </Text>
            <Text className="text-xs font-outfit leading-relaxed" style={{ color: colors.text.secondary }}>
              Full app interface and content support
            </Text>
          </View>

          <View className="mb-3">
            <Text className="text-sm font-bold font-outfit mb-1" style={{ color: colors.text.primary }}>
              🇱🇰 සිංහල (Sinhala)
            </Text>
            <Text className="text-xs font-outfit leading-relaxed" style={{ color: colors.text.secondary }}>
              Complete interface translation for Sinhala speakers
            </Text>
          </View>

          <View>
            <Text className="text-sm font-bold font-outfit mb-1" style={{ color: colors.text.primary }}>
              🇱🇰 தமிழ் (Tamil)
            </Text>
            <Text className="text-xs font-outfit leading-relaxed" style={{ color: colors.text.secondary }}>
              Complete interface translation for Tamil speakers
            </Text>
          </View>
        </View>

        {/* Current Selection */}
        <View className="mt-6 p-4 rounded-2xl" style={{ backgroundColor: colors.brand.gold + '10' }}>
          <Text className="text-xs font-bold font-outfit mb-1" style={{ color: colors.brand.gold }}>
            CURRENTLY SELECTED
          </Text>
          <Text className="text-base font-bold font-outfit" style={{ color: colors.text.primary }}>
            {LANGUAGES.find(l => l.code === selectedLanguage)?.nativeName}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
