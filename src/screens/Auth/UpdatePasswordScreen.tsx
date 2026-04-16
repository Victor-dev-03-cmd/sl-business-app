import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle, Globe } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface UpdatePasswordScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const UpdatePasswordScreen = ({ onSuccess, onBack }: UpdatePasswordScreenProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      Alert.alert(
        'Success', 
        'Your password has been successfully reset. Please sign in with your new password.',
        [{ text: 'OK', onPress: async () => {
          await supabase.auth.signOut();
          onSuccess();
        }}]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 px-8 justify-center py-10"
        >
          <View className="items-center mb-10">
            <View className="bg-brand-dark p-3 rounded-2xl mb-4">
              <Globe size={32} color="white" />
            </View>
            <Text className="text-2xl font-bold text-brand-dark tracking-tight font-outfit">
              SL BUSINESS INDEX
            </Text>
          </View>

          <View className="bg-white rounded p-8 shadow-sm border border-gray-100">
            <TouchableOpacity 
              className="flex-row items-center mb-8"
              onPress={onBack}
            >
              <ArrowLeft size={16} color="#94a3b8" />
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest ml-2 font-outfit">Back to Login</Text>
            </TouchableOpacity>

            <Text className="text-3xl text-gray-900 mb-2 font-outfit font-bold">
              Create New Password
            </Text>
            <Text className="text-gray-500 mb-8 font-outfit">
              Enter your new secure password below.
            </Text>

            <View className="space-y-5">
              <View className="relative mt-4">
                <View className="absolute left-4 top-4 z-10">
                  <Lock size={20} color="#94a3b8" />
                </View>
                <TextInput
                  placeholder="New Password"
                  placeholderTextColor="#94a3b8"
                  className="bg-gray-50 text-gray-900 rounded-full py-4 pl-12 pr-12 border border-gray-200 focus:border-brand-blue font-outfit"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  className="absolute right-4 top-4"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye size={20} color="#94a3b8" /> : <EyeOff size={20} color="#94a3b8" />}
                </TouchableOpacity>
              </View>

              <View className="relative mt-4">
                <View className="absolute left-4 top-4 z-10">
                  <Lock size={20} color="#94a3b8" />
                </View>
                <TextInput
                  placeholder="Confirm New Password"
                  placeholderTextColor="#94a3b8"
                  className="bg-gray-50 text-gray-900 rounded-full py-4 pl-12 pr-12 border border-gray-200 focus:border-brand-blue font-outfit"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              className={`bg-brand-dark rounded-full py-5 flex-row justify-center items-center mt-8 ${
                loading ? 'opacity-80' : ''
              }`}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <CheckCircle size={20} color="white" />
                  <Text className="text-white text-lg ml-3 font-outfit font-bold">
                    Reset Password
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};
