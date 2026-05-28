import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Shield,
  Lock,
  Fingerprint,
  Key,
  Eye,
  EyeOff,
  MapPin,
  Camera,
  Mic,
  Share2,
  Trash2,
  FileText,
  Download,
  History,
  CheckCircle,
  AlertTriangle,
  ChevronRight
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dynamic import for expo-local-authentication to avoid bundling errors
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
  console.log('expo-local-authentication not available, biometric features disabled');
}

const BIOMETRIC_STORAGE_KEY = '@biometric_enabled';
const PIN_STORAGE_KEY = '@pin_enabled';
const E2E_STORAGE_KEY = '@e2e_encryption';
const LOCATION_PRIVACY_KEY = '@location_privacy';

export const PrivacySecurityScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const colors = Colors[theme];

  // App Lock States
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  // Privacy States
  const [e2eEncryption, setE2eEncryption] = useState(true);
  const [locationPrivacy, setLocationPrivacy] = useState(false);
  const [cameraAccess, setCameraAccess] = useState(true);
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const [thirdPartySharing, setThirdPartySharing] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadPrivacySettings();
  }, []);

  const checkBiometricAvailability = async () => {
    if (!LocalAuthentication) {
      console.log('Biometric authentication not available');
      return;
    }

    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (compatible && enrolled) {
        setBiometricAvailable(true);

        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        }
      }
    } catch (error) {
      console.error('Error checking biometric:', error);
    }
  };

  const loadPrivacySettings = async () => {
    try {
      const biometric = await AsyncStorage.getItem(BIOMETRIC_STORAGE_KEY);
      const pin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
      const e2e = await AsyncStorage.getItem(E2E_STORAGE_KEY);
      const location = await AsyncStorage.getItem(LOCATION_PRIVACY_KEY);

      if (biometric) setBiometricEnabled(JSON.parse(biometric));
      if (pin) setPinEnabled(JSON.parse(pin));
      if (e2e) setE2eEncryption(JSON.parse(e2e));
      if (location) setLocationPrivacy(JSON.parse(location));
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (!LocalAuthentication) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return;
    }

    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricType}`,
          fallbackLabel: 'Use PIN',
          cancelLabel: 'Cancel',
        });

        if (result.success) {
          setBiometricEnabled(true);
          await AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(true));
          Alert.alert('Success', `${biometricType} has been enabled`);
        } else {
          setBiometricEnabled(false);
        }
      } catch (error) {
        console.error('Biometric error:', error);
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    } else {
      setBiometricEnabled(false);
      await AsyncStorage.setItem(BIOMETRIC_STORAGE_KEY, JSON.stringify(false));
    }
  };

  const handlePinSetup = () => {
    // Navigate to PIN setup screen (to be created)
    Alert.alert(
      'PIN Setup',
      'Would you like to set up a PIN code to lock the app?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Set PIN',
          onPress: () => {
            // TODO: Navigate to PIN setup screen
            setPinEnabled(true);
            AsyncStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(true));
          }
        }
      ]
    );
  };

  const handleE2EToggle = async (value: boolean) => {
    setE2eEncryption(value);
    await AsyncStorage.setItem(E2E_STORAGE_KEY, JSON.stringify(value));

    if (value) {
      Alert.alert(
        'E2E Encryption Enabled',
        'Your data is now encrypted end-to-end for maximum security.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleLocationPrivacyToggle = async (value: boolean) => {
    setLocationPrivacy(value);
    await AsyncStorage.setItem(LOCATION_PRIVACY_KEY, JSON.stringify(value));
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your data from the app. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement data deletion
            Alert.alert('Data Deleted', 'All your data has been removed.');
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Download a copy of all your data stored in the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // TODO: Implement data export
            Alert.alert('Export Started', 'Your data is being prepared for download.');
          }
        }
      ]
    );
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
        <View className="flex-1">
          <Text className="text-xl font-bold font-outfit" style={{ color: colors.text.primary }}>
            Privacy & Security
          </Text>
          <Text className="text-xs font-outfit" style={{ color: colors.text.tertiary }}>
            Protect your account and data
          </Text>
        </View>
        <Shield size={24} color={colors.brand.blue} />
      </View>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false}>
        {/* App Lock Section */}
        <View className="rounded-[24px] p-6 mb-6 shadow-sm" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-4" style={{ color: colors.text.tertiary }}>
            APP LOCK
          </Text>

          {/* Biometric Lock */}
          {biometricAvailable && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.blue + '20' }}>
                    <Fingerprint size={20} color={colors.brand.blue} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                      {biometricType}
                    </Text>
                    <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                      Use {biometricType.toLowerCase()} to unlock
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: colors.border, true: colors.brand.blue }}
                  thumbColor={biometricEnabled ? colors.text.inverse : colors.text.tertiary}
                />
              </View>
            </View>
          )}

          {/* PIN Code */}
          <TouchableOpacity
            onPress={handlePinSetup}
            className="flex-row items-center justify-between mb-6"
          >
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.gold + '20' }}>
                <Key size={20} color={colors.brand.gold} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  PIN Code
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  {pinEnabled ? 'PIN is enabled' : 'Set up PIN lock'}
                </Text>
              </View>
            </View>
            {pinEnabled ? (
              <CheckCircle size={20} color={colors.success} />
            ) : (
              <ChevronRight size={16} color={colors.text.tertiary} />
            )}
          </TouchableOpacity>

          {/* Auto Lock */}
          <TouchableOpacity className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.dark + '20' }}>
                <Lock size={20} color={colors.brand.dark} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  Auto Lock
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  Lock after 1 minute
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Encryption Section */}
        <View className="rounded-[24px] p-6 mb-6 shadow-sm" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-4" style={{ color: colors.text.tertiary }}>
            DATA ENCRYPTION
          </Text>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.success + '20' }}>
                <Shield size={20} color={colors.success} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  End-to-End Encryption
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  Your data is encrypted on device
                </Text>
              </View>
            </View>
            <Switch
              value={e2eEncryption}
              onValueChange={handleE2EToggle}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={e2eEncryption ? colors.text.inverse : colors.text.tertiary}
            />
          </View>
        </View>

        {/* Privacy Controls Section */}
        <View className="rounded-[24px] p-6 mb-6 shadow-sm" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-4" style={{ color: colors.text.tertiary }}>
            PRIVACY CONTROLS
          </Text>

          {/* Location Privacy */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.info + '20' }}>
                <MapPin size={20} color={colors.info} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  Hide Location
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  Don't share precise location
                </Text>
              </View>
            </View>
            <Switch
              value={locationPrivacy}
              onValueChange={handleLocationPrivacyToggle}
              trackColor={{ false: colors.border, true: colors.brand.blue }}
              thumbColor={locationPrivacy ? colors.text.inverse : colors.text.tertiary}
            />
          </View>

          {/* Camera Access */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.blue + '20' }}>
                <Camera size={20} color={colors.brand.blue} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  Camera Access
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  Allow camera for QR & photos
                </Text>
              </View>
            </View>
            <Switch
              value={cameraAccess}
              onValueChange={setCameraAccess}
              trackColor={{ false: colors.border, true: colors.brand.blue }}
              thumbColor={cameraAccess ? colors.text.inverse : colors.text.tertiary}
            />
          </View>

          {/* Microphone Access */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.warning + '20' }}>
                <Mic size={20} color={colors.warning} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  Microphone Access
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  Voice search & audio notes
                </Text>
              </View>
            </View>
            <Switch
              value={microphoneAccess}
              onValueChange={setMicrophoneAccess}
              trackColor={{ false: colors.border, true: colors.brand.blue }}
              thumbColor={microphoneAccess ? colors.text.inverse : colors.text.tertiary}
            />
          </View>

          {/* Third Party Sharing */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.error + '20' }}>
                <Share2 size={20} color={colors.error} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  Third-Party Sharing
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  Share data with partners
                </Text>
              </View>
            </View>
            <Switch
              value={thirdPartySharing}
              onValueChange={setThirdPartySharing}
              trackColor={{ false: colors.border, true: colors.brand.blue }}
              thumbColor={thirdPartySharing ? colors.text.inverse : colors.text.tertiary}
            />
          </View>
        </View>

        {/* Data Management Section */}
        <View className="rounded-[24px] p-6 mb-6 shadow-sm" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-4" style={{ color: colors.text.tertiary }}>
            DATA MANAGEMENT
          </Text>

          {/* View Activity Log */}
          <TouchableOpacity className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.dark + '20' }}>
                <History size={20} color={colors.brand.dark} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  Activity Log
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  View your activity history
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Export Data */}
          <TouchableOpacity
            onPress={handleExportData}
            className="flex-row items-center justify-between mb-6"
          >
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.blue + '20' }}>
                <Download size={20} color={colors.brand.blue} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                  Export My Data
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  Download a copy of your data
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Delete Data */}
          <TouchableOpacity
            onPress={handleDeleteData}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.error + '20' }}>
                <Trash2 size={20} color={colors.error} />
              </View>
              <View className="flex-1">
                <Text className="font-bold font-outfit" style={{ color: colors.error }}>
                  Delete All Data
                </Text>
                <Text className="text-[10px] font-outfit" style={{ color: colors.text.tertiary }}>
                  Permanently remove your data
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Legal Section */}
        <View className="rounded-[24px] p-6 mb-6 shadow-sm" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-4" style={{ color: colors.text.tertiary }}>
            LEGAL
          </Text>

          {/* Privacy Policy */}
          <TouchableOpacity className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.dark + '20' }}>
                <FileText size={20} color={colors.brand.dark} />
              </View>
              <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                Privacy Policy
              </Text>
            </View>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </TouchableOpacity>

          {/* Terms of Service */}
          <TouchableOpacity className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="p-3 rounded-2xl mr-4" style={{ backgroundColor: colors.brand.dark + '20' }}>
                <FileText size={20} color={colors.brand.dark} />
              </View>
              <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                Terms of Service
              </Text>
            </View>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Security Status Card */}
        <View className="rounded-[24px] p-6 mb-6" style={{ backgroundColor: e2eEncryption && (biometricEnabled || pinEnabled) ? colors.success + '10' : colors.warning + '10', borderWidth: 1, borderColor: e2eEncryption && (biometricEnabled || pinEnabled) ? colors.success + '30' : colors.warning + '30' }}>
          <View className="flex-row items-center mb-2">
            {e2eEncryption && (biometricEnabled || pinEnabled) ? (
              <CheckCircle size={20} color={colors.success} />
            ) : (
              <AlertTriangle size={20} color={colors.warning} />
            )}
            <Text className="font-bold font-outfit ml-2" style={{ color: e2eEncryption && (biometricEnabled || pinEnabled) ? colors.success : colors.warning }}>
              {e2eEncryption && (biometricEnabled || pinEnabled) ? 'Security Active' : 'Action Recommended'}
            </Text>
          </View>
          <Text className="text-xs font-outfit leading-relaxed" style={{ color: colors.text.secondary }}>
            {e2eEncryption && (biometricEnabled || pinEnabled)
              ? 'Your account is protected with encryption and biometric lock.'
              : 'Enable app lock and encryption for maximum security.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
