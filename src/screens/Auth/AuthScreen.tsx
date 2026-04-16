import React, { useState, useEffect } from 'react';
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
import { Mail, Lock, User, LogIn, UserPlus, Globe, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

// Simple Google Logo using SVG/View
const GoogleIcon = () => (
  <View className="flex-row items-center mr-3">
    <View className="w-5 h-5 bg-[#4285F4] items-center justify-center rounded-sm">
      <Text className="text-white font-bold text-[10px] font-outfit">G</Text>
    </View>
  </View>
);

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'update-password';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  initialMode?: AuthMode;
}

export const AuthScreen = ({ onAuthSuccess, initialMode = 'login' }: AuthScreenProps) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleAuth = async () => {
    if (mode !== 'verify-otp' && mode !== 'update-password' && !email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (mode === 'login' || mode === 'signup' || mode === 'update-password') {
      if (!password) {
        Alert.alert('Error', 'Please enter a password');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
      if (mode === 'update-password' && password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess();
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        Alert.alert('Success', 'Verification code sent to your email!');
        setMode('verify-otp');
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://slbusinessindex.com/update-password',
        });
        if (error) throw error;
        Alert.alert('Success', 'Password reset email sent!');
        setMode('login');
      } else if (mode === 'verify-otp') {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'signup',
        });
        if (error) throw error;
        onAuthSuccess();
      } else if (mode === 'update-password') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        Alert.alert('Success', 'Password updated successfully! Please sign in with your new password.');
        await supabase.auth.signOut();
        onAuthSuccess();
      }
    } catch (error: any) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderInputs = () => {
    if (mode === 'verify-otp') {
      return (
        <View className="space-y-4">
          <View className="relative mt-4">
            <View className="absolute left-4 top-4 z-10">
              <Mail size={20} color="#94a3b8" />
            </View>
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              className="bg-gray-50 text-gray-900 rounded-full py-4 pl-12 pr-4 border border-gray-200 focus:border-brand-blue font-outfit"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View className="relative mt-4">
            <View className="absolute left-4 top-4 z-10">
              <CheckCircle size={20} color="#94a3b8" />
            </View>
            <TextInput
              placeholder="Verification Code"
              placeholderTextColor="#94a3b8"
              className="bg-gray-50 text-gray-900 rounded-full py-4 pl-12 pr-4 border border-gray-200 focus:border-brand-blue font-outfit"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
            />
          </View>
        </View>
      );
    }

    return (
      <View className="space-y-5">
        {mode === 'signup' && (
          <View className="relative">
            <View className="absolute left-4 top-4 z-10">
              <User size={20} color="#94a3b8" />
            </View>
            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              className="bg-gray-50 text-gray-900 rounded-full py-4 pl-12 pr-4 border border-gray-200 focus:border-brand-blue font-outfit"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
        )}

        {mode !== 'update-password' && (
          <View className="relative mt-4">
            <View className="absolute left-4 top-4 z-10">
              <Mail size={20} color="#94a3b8" />
            </View>
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              className="bg-gray-50 text-gray-900 rounded-full py-4 pl-12 pr-4 border border-gray-200 focus:border-brand-blue font-outfit"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        )}

        {mode !== 'forgot-password' && (
          <>
            <View className="relative mt-4">
              <View className="absolute left-4 top-4 z-10">
                <Lock size={20} color="#94a3b8" />
              </View>
              <TextInput
                placeholder={mode === 'update-password' ? "New Password" : "Password"}
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

            {mode === 'update-password' && (
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
            )}
          </>
        )}
      </View>
    );
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
            <Text className="text-3xl text-gray-900 mb-2 font-outfit font-bold">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot-password' && 'Reset Password'}
              {mode === 'verify-otp' && 'Verify Email'}
              {mode === 'update-password' && 'New Password'}
            </Text>
            <Text className="text-gray-500 mb-8 font-outfit">
              {mode === 'login' && 'Enter your details to sign in'}
              {mode === 'signup' && 'Fill in your details to get started'}
              {mode === 'forgot-password' && 'Enter your email to receive a reset link'}
              {mode === 'verify-otp' && 'Enter the code sent to your email'}
              {mode === 'update-password' && 'Set a new password for your account'}
            </Text>

            {renderInputs()}

            {mode === 'login' && (
              <TouchableOpacity className="items-end mt-2" onPress={() => setMode('forgot-password')}>
                <Text className="text-brand-blue font-bold text-xs font-outfit">FORGOT PASSWORD?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className={`bg-brand-dark rounded-full py-5 flex-row justify-center items-center mt-8 ${
                loading ? 'opacity-80' : ''
              }`}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={20} color="white" /> : <UserPlus size={20} color="white" />}
                  <Text className="text-white text-lg ml-3 font-outfit font-bold">
                    {mode === 'login' && 'Sign In'}
                    {mode === 'signup' && 'Get Started'}
                    {mode === 'forgot-password' && 'Send Link'}
                    {mode === 'verify-otp' && 'Verify Code'}
                    {mode === 'update-password' && 'Update Password'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {(mode === 'login' || mode === 'signup') && (
              <>
                <View className="flex-row items-center my-8">
                  <View className="flex-1 h-[1px] bg-gray-200" />
                  <Text className="mx-4 text-gray-400 text-[10px] tracking-widest font-outfit font-bold">
                    SECURE OAUTH
                  </Text>
                  <View className="flex-1 h-[1px] bg-gray-200" />
                </View>

                <TouchableOpacity className="bg-white border border-gray-200 rounded-full py-4 flex-row justify-center items-center">
                  <GoogleIcon />
                  <Text className="text-gray-700 font-bold font-outfit">Continue with Google</Text>
                </TouchableOpacity>
              </>
            )}

            <View className="flex-row justify-center mt-8">
              <Text className="text-gray-500 font-outfit">
                {mode === 'login' ? "Don't have an account? " : "Remember your password? "}
              </Text>
              <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                <Text className="text-brand-blue font-bold font-outfit">
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};
