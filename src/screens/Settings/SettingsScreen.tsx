import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Settings, Bell, Shield, HelpCircle, ChevronRight, Globe, LayoutDashboard, Moon, Sun, Monitor, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../context/LanguageContext';
import { getTextStyles } from '../../utils/fontHelpers';

const LANGUAGE_STORAGE_KEY = '@app_language';

export const SettingsScreen = ({ session }: { session: Session | null }) => {
  const navigation = useNavigation<any>();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVendor, setIsVendor] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('none');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('English');
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const colors = Colors[theme];
  const { t, language } = useLanguage();

  useEffect(() => {
    if (session?.user) {
      fetchUserRole();
    }
  }, [session]);

  useFocusEffect(
    React.useCallback(() => {
      loadLanguagePreference();
    }, [])
  );

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage) {
        const languageNames: Record<string, string> = {
          'en': 'English',
          'si': 'සිංහල',
          'ta': 'தமிழ்'
        };
        setCurrentLanguage(languageNames[savedLanguage] || 'English');
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const fetchUserRole = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session?.user.id)
        .single();

      if (data) setRole(data.role);

      // Check if user owns any businesses → vendor
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, verification_status')
        .eq('owner_id', session?.user.id)
        .limit(1);

      if (bizData && bizData.length > 0) {
        setIsVendor(true);
        setVerificationStatus(bizData[0].verification_status ?? 'none');
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleThemeChange = () => {
    Alert.alert(
      t('settings.appearance'),
      'Select your preferred theme mode',
      [
        {
          text: t('theme.light'),
          onPress: () => setThemeMode('light'),
        },
        {
          text: t('theme.dark'),
          onPress: () => setThemeMode('dark'),
        },
        {
          text: t('theme.system'),
          onPress: () => setThemeMode('system'),
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
        return Monitor;
      default:
        return Sun;
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return t('theme.light');
      case 'dark':
        return t('theme.dark');
      case 'system':
        return t('theme.system');
      default:
        return t('theme.light');
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="px-6">
        <View className="pt-8 pb-10 items-center">
          <View className="relative">
            <View className="w-24 h-24 rounded-[32px] items-center justify-center shadow-lg mb-4 overflow-hidden" style={{ backgroundColor: colors.brand.dark }}>
               <Text className="text-3xl font-bold font-outfit" style={{ color: colors.text.inverse }}>
                 {session?.user?.email?.charAt(0).toUpperCase()}
               </Text>
            </View>
            <TouchableOpacity className="absolute bottom-4 -right-2 p-2.5 rounded-2xl border-2" style={{ backgroundColor: colors.brand.blue, borderColor: colors.surface }}>
              <User size={14} color={colors.text.inverse} fill={colors.text.inverse} />
            </TouchableOpacity>
          </View>
          <Text className="text-2xl font-bold font-outfit mt-2" style={{ color: colors.text.primary }}>{session?.user?.email}</Text>
          <View className="px-3 py-1 rounded-full mt-2" style={{ backgroundColor: colors.brand.gold + '20' }}>
            <Text className="text-[10px] font-bold font-outfit uppercase tracking-widest" style={{ color: colors.brand.gold }}>
              {role ? t(`account.${role}Account` as any) : t('account.premiumMember')}
            </Text>
          </View>
        </View>

        {/* Dashboard Section for Admin/Vendor */}
        {(role === 'admin' || role === 'ceo' || role === 'vendor') && (
          <View className="rounded-[32px] p-6 mb-8 shadow-sm" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-6 ml-2" style={{ color: colors.text.tertiary }}>{t('settings.management')}</Text>
            <TouchableOpacity className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.blue + '20' }}>
                  <LayoutDashboard size={20} color={colors.brand.blue} />
                </View>
                <View>
                  <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                    {role === 'vendor' ? t('settings.vendorDashboard') : t('settings.adminDashboard')}
                  </Text>
                  <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>Manage your business & listings</Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}

        <View className="rounded-[32px] p-6 mb-8 shadow-sm" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
           <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-6 ml-2" style={{ color: colors.text.tertiary }}>{t('settings.appSettings')}</Text>

           {/* Theme Toggle */}
           <TouchableOpacity
             onPress={handleThemeChange}
             className="flex-row items-center justify-between mb-8"
           >
             <View className="flex-row items-center">
               <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: isDark ? colors.brand.gold + '20' : colors.brand.blue + '20' }}>
                 {React.createElement(getThemeIcon(), { size: 20, color: isDark ? colors.brand.gold : colors.brand.blue })}
               </View>
               <View>
                 <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>{t('settings.appearance')}</Text>
                 <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                   {getThemeLabel()} mode
                 </Text>
               </View>
             </View>
             <View className="flex-row items-center">
               <View className="px-3 py-1.5 rounded-lg mr-2" style={{ backgroundColor: isDark ? colors.brand.gold + '20' : colors.brand.blue + '20' }}>
                 <Text className="text-xs font-bold font-outfit" style={{ color: isDark ? colors.brand.gold : colors.brand.blue }}>
                   {getThemeLabel()}
                 </Text>
               </View>
               <ChevronRight size={16} color={colors.text.tertiary} />
             </View>
           </TouchableOpacity>

           {/* Notifications Toggle */}
           <View className="flex-row items-center justify-between mb-8">
             <View className="flex-row items-center">
               <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.info + '20' }}>
                 <Bell size={20} color={colors.info} />
               </View>
               <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>{t('settings.notifications')}</Text>
             </View>
             <Switch
               value={notificationsEnabled}
               onValueChange={setNotificationsEnabled}
               trackColor={{ false: colors.border, true: colors.brand.blue }}
               thumbColor={notificationsEnabled ? colors.text.inverse : colors.text.tertiary}
             />
           </View>

           {/* Account Info */}
           <TouchableOpacity
             onPress={() => navigation.navigate('AccountInfo' as never)}
             className="flex-row items-center justify-between mb-8"
           >
             <View className="flex-row items-center">
               <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.dark + '20' }}>
                 <User size={20} color={colors.brand.dark} />
               </View>
               <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>{t('settings.accountInfo')}</Text>
             </View>
             <ChevronRight size={16} color={colors.text.tertiary} />
           </TouchableOpacity>

           {/* Language */}
           <TouchableOpacity
             onPress={() => navigation.navigate('Language' as never)}
             className="flex-row items-center justify-between mb-8"
           >
             <View className="flex-row items-center">
               <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.gold + '20' }}>
                 <Globe size={20} color={colors.brand.gold} />
               </View>
               <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>{t('settings.language')}</Text>
             </View>
             <View className="flex-row items-center">
               <Text className="text-xs mr-2 font-outfit" style={{ color: colors.text.tertiary }}>{currentLanguage}</Text>
               <ChevronRight size={16} color={colors.text.tertiary} />
             </View>
           </TouchableOpacity>

           {/* Business Verification — only for vendors */}
           {isVendor && (
             <TouchableOpacity
               onPress={() => navigation.navigate('VendorVerification' as never)}
               className="flex-row items-center justify-between mb-8"
             >
               <View className="flex-row items-center">
                 <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: verificationStatus === 'approved' ? '#10b98120' : verificationStatus === 'pending' ? '#f59e0b20' : colors.brand.blue + '20' }}>
                   <ShieldCheck size={20} color={verificationStatus === 'approved' ? '#10b981' : verificationStatus === 'pending' ? '#f59e0b' : colors.brand.blue} />
                 </View>
                 <View>
                   <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>Business Verification</Text>
                   <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                     {verificationStatus === 'approved' ? 'Verified ✓' : verificationStatus === 'pending' ? 'Under review…' : 'Get your business verified'}
                   </Text>
                 </View>
               </View>
               <ChevronRight size={16} color={colors.text.tertiary} />
             </TouchableOpacity>
           )}

           {/* Privacy & Security */}
           <TouchableOpacity
             onPress={() => navigation.navigate('PrivacySecurity' as never)}
             className="flex-row items-center justify-between"
           >
             <View className="flex-row items-center">
               <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.success + '20' }}>
                 <Shield size={20} color={colors.success} />
               </View>
               <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>{t('settings.privacy')}</Text>
             </View>
             <ChevronRight size={16} color={colors.text.tertiary} />
           </TouchableOpacity>
        </View>

        <View className="rounded-[32px] p-6 mb-8 shadow-sm" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
           <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-6 ml-2" style={{ color: colors.text.tertiary }}>{t('settings.support')}</Text>

           {/* Help Center */}
           <TouchableOpacity className="flex-row items-center justify-between mb-8">
             <View className="flex-row items-center">
               <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.dark + '20' }}>
                 <HelpCircle size={20} color={colors.brand.dark} />
               </View>
               <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>{t('settings.help')}</Text>
             </View>
             <ChevronRight size={16} color={colors.text.tertiary} />
           </TouchableOpacity>

           {/* Settings */}
           <TouchableOpacity className="flex-row items-center justify-between">
             <View className="flex-row items-center">
               <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.dark + '20' }}>
                 <Settings size={20} color={colors.brand.dark} />
               </View>
               <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>{t('settings.title')}</Text>
             </View>
             <ChevronRight size={16} color={colors.text.tertiary} />
           </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="rounded-[32px] py-6 flex-row items-center justify-center mb-10"
          style={{ backgroundColor: colors.error + '10' }}
        >
           <LogOut size={20} color={colors.error} />
           <Text className="font-bold font-outfit ml-3" style={{ color: colors.error }}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
