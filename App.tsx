import "./global.css";
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, AppState, Alert, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from './src/lib/supabase';
import { AuthScreen } from './src/screens/Auth/AuthScreen';
import { UpdatePasswordScreen } from './src/screens/Auth/UpdatePasswordScreen';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import * as SplashScreen from 'expo-splash-screen';
import { 
  useFonts,
  Outfit_100Thin,
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black 
} from '@expo-google-fonts/outfit';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit: Outfit_400Regular,
    "Outfit-Thin": Outfit_100Thin,
    "Outfit-ExtraLight": Outfit_200ExtraLight,
    "Outfit-Light": Outfit_300Light,
    "Outfit-Medium": Outfit_500Medium,
    "Outfit-SemiBold": Outfit_600SemiBold,
    "Outfit-Bold": Outfit_700Bold,
    "Outfit-ExtraBold": Outfit_800ExtraBold,
    "Outfit-Black": Outfit_900Black,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
        setSession(session);
      } else if (event === 'SIGNED_IN') {
        setSession(session);
        // We only clear recovery mode if it wasn't just set by PASSWORD_RECOVERY
        // Using a functional update to get the latest value of showPasswordReset
        setShowPasswordReset(prev => {
          if (prev) return true; // keep it true if it's already true
          return false;
        });
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setShowPasswordReset(false);
      } else if (event === 'USER_UPDATED') {
        setSession(session);
      }
    });

    // Handle deep links for password recovery
    const handleDeepLink = async (url: string) => {
      console.log('Received deep link:', url);
      
      try {
        // Supabase sends tokens in the hash fragment #
        // Example: sl-business-app://reset-password#access_token=...&refresh_token=...&type=recovery
        // We replace '#' with '?' to use URLSearchParams
        const cleanUrl = url.replace('#', '?');
        const urlObj = new URL(cleanUrl);
        
        const accessToken = urlObj.searchParams.get('access_token');
        const refreshToken = urlObj.searchParams.get('refresh_token');
        const type = urlObj.searchParams.get('type');

        if (accessToken && refreshToken && (type === 'recovery' || url.includes('type=recovery'))) {
          setLoading(true);
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (!error) {
            console.log('Session set successfully from deep link');
            setShowPasswordReset(true);
          } else {
            console.error('Error setting session from deep link:', error.message);
            Alert.alert('Link Error', 'The recovery link is invalid or has expired.');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to parse deep link:', err);
      }
    };

    const linkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Refresh session on app foreground
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.refreshSession();
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !loading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loading]);

  if (!fontsLoaded || loading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RNStatusBar translucent={!!true} backgroundColor="transparent" />
        <View className="flex-1" onLayout={onLayoutRootView}>
          {showPasswordReset ? (
            <>
              <UpdatePasswordScreen 
                onSuccess={() => setShowPasswordReset(false)}
                onBack={() => setShowPasswordReset(false)}
              />
            </>
          ) : !session ? (
            <>
              <AuthScreen 
                onAuthSuccess={() => setShowPasswordReset(false)} 
              />
            </>
          ) : (
            <MainTabNavigator session={session} />
          )}
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
