import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Phone, Briefcase, ChevronLeft, Save, Camera, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';

interface Profile {
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  avatar_url: string;
  verification_status: string;
  role: string;
}

export const AccountInfoScreen = ({ session }: { session: Session | null }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    avatar_url: '',
    verification_status: 'unverified',
    role: 'user'
  });

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user.id)
        .single();

      if (error) throw error;

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          email: profileData.email || session?.user.email || '',
          phone: profileData.phone || '',
          job_title: profileData.job_title || '',
          avatar_url: profileData.avatar_url || '',
          verification_status: profileData.verification_status || 'unverified',
          role: profileData.role || 'user'
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          job_title: profile.job_title,
          updated_at: new Date().toISOString()
        })
        .eq('id', session?.user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getVerificationBadgeColor = () => {
    switch (profile.verification_status) {
      case 'verified':
        return colors.success;
      case 'pending':
        return colors.warning;
      default:
        return colors.text.tertiary;
    }
  };

  const getVerificationText = () => {
    switch (profile.verification_status) {
      case 'verified':
        return 'Verified Account';
      case 'pending':
        return 'Verification Pending';
      default:
        return 'Unverified';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.brand.dark} />
      </SafeAreaView>
    );
  }

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
        <Text className="text-xl font-bold font-outfit flex-1" style={{ color: colors.text.primary }}>
          Account Information
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-2xl flex-row items-center"
          style={{ backgroundColor: colors.brand.blue }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <>
              <Save size={16} color={colors.text.inverse} />
              <Text className="ml-2 font-bold font-outfit" style={{ color: colors.text.inverse }}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View className="items-center py-8">
          <View className="relative">
            <View
              className="w-28 h-28 rounded-[32px] items-center justify-center overflow-hidden"
              style={{ backgroundColor: colors.brand.dark }}
            >
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-4xl font-bold font-outfit" style={{ color: colors.text.inverse }}>
                  {profile.full_name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              className="absolute bottom-0 right-0 p-2.5 rounded-2xl border-2"
              style={{ backgroundColor: colors.brand.blue, borderColor: colors.surface }}
            >
              <Camera size={16} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>

          {/* Verification Badge */}
          <View className="flex-row items-center mt-4 px-4 py-2 rounded-full" style={{ backgroundColor: getVerificationBadgeColor() + '20' }}>
            <ShieldCheck size={14} color={getVerificationBadgeColor()} />
            <Text className="ml-2 text-xs font-bold font-outfit" style={{ color: getVerificationBadgeColor() }}>
              {getVerificationText()}
            </Text>
          </View>

          {/* Role Badge */}
          <View className="px-3 py-1 rounded-full mt-2" style={{ backgroundColor: colors.brand.gold + '20' }}>
            <Text className="text-[10px] font-bold font-outfit uppercase tracking-widest" style={{ color: colors.brand.gold }}>
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Account
            </Text>
          </View>
        </View>

        {/* Form Fields */}
        <View className="px-6 pb-8">
          {/* Full Name */}
          <View className="mb-6">
            <Text className="text-xs font-bold font-outfit mb-2 ml-1" style={{ color: colors.text.secondary }}>
              FULL NAME
            </Text>
            <View className="flex-row items-center px-4 py-4 rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <User size={20} color={colors.brand.dark} />
              <TextInput
                value={profile.full_name}
                onChangeText={(text) => setProfile({ ...profile, full_name: text })}
                placeholder="Enter your full name"
                placeholderTextColor={colors.input.placeholder}
                className="flex-1 ml-3 font-outfit"
                style={{ color: colors.text.primary }}
              />
            </View>
          </View>

          {/* Email (Read-only) */}
          <View className="mb-6">
            <Text className="text-xs font-bold font-outfit mb-2 ml-1" style={{ color: colors.text.secondary }}>
              EMAIL
            </Text>
            <View className="flex-row items-center px-4 py-4 rounded-2xl border" style={{ backgroundColor: colors.input.background, borderColor: colors.border }}>
              <Mail size={20} color={colors.text.tertiary} />
              <TextInput
                value={profile.email}
                editable={false}
                className="flex-1 ml-3 font-outfit"
                style={{ color: colors.text.tertiary }}
              />
            </View>
            <Text className="text-[10px] font-outfit mt-1 ml-1" style={{ color: colors.text.tertiary }}>
              Email cannot be changed
            </Text>
          </View>

          {/* Phone */}
          <View className="mb-6">
            <Text className="text-xs font-bold font-outfit mb-2 ml-1" style={{ color: colors.text.secondary }}>
              PHONE NUMBER
            </Text>
            <View className="flex-row items-center px-4 py-4 rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Phone size={20} color={colors.brand.dark} />
              <TextInput
                value={profile.phone}
                onChangeText={(text) => setProfile({ ...profile, phone: text })}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.input.placeholder}
                keyboardType="phone-pad"
                className="flex-1 ml-3 font-outfit"
                style={{ color: colors.text.primary }}
              />
            </View>
          </View>

          {/* Job Title */}
          <View className="mb-6">
            <Text className="text-xs font-bold font-outfit mb-2 ml-1" style={{ color: colors.text.secondary }}>
              JOB TITLE / POSITION
            </Text>
            <View className="flex-row items-center px-4 py-4 rounded-2xl border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
              <Briefcase size={20} color={colors.brand.dark} />
              <TextInput
                value={profile.job_title}
                onChangeText={(text) => setProfile({ ...profile, job_title: text })}
                placeholder="e.g. Business Owner, Manager"
                placeholderTextColor={colors.input.placeholder}
                className="flex-1 ml-3 font-outfit"
                style={{ color: colors.text.primary }}
              />
            </View>
          </View>

          {/* Account Details Card */}
          <View className="rounded-[24px] p-6 border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-4" style={{ color: colors.text.tertiary }}>
              Account Details
            </Text>

            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-outfit" style={{ color: colors.text.secondary }}>Account Type</Text>
              <Text className="text-sm font-bold font-outfit" style={{ color: colors.text.primary }}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-outfit" style={{ color: colors.text.secondary }}>Verification Status</Text>
              <Text className="text-sm font-bold font-outfit" style={{ color: getVerificationBadgeColor() }}>
                {getVerificationText()}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-sm font-outfit" style={{ color: colors.text.secondary }}>User ID</Text>
              <Text className="text-xs font-mono font-outfit" style={{ color: colors.text.tertiary }}>
                {session?.user.id.substring(0, 8)}...
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
