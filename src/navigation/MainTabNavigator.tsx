import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Home, Map as MapIcon, PlusCircle, User as UserIcon } from 'lucide-react-native';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { BusinessListScreen } from '../screens/Business/BusinessListScreen';
import { RegisterBusinessScreen } from '../screens/RegisterBusiness/RegisterBusinessScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { BusinessNewsScreen } from '../screens/News/BusinessNewsScreen';
import { BusinessDetailsScreen } from '../screens/BusinessDetails/BusinessDetailsScreen';
import { QRScannerScreen } from '../screens/QRScanner/QRScannerScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { AccountInfoScreen } from '../screens/Account/AccountInfoScreen';
import { LanguageScreen } from '../screens/Settings/LanguageScreen';
import { PrivacySecurityScreen } from '../screens/Settings/PrivacySecurityScreen';
import { Session } from '@supabase/supabase-js';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import { getTextStyles } from '../utils/fontHelpers';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { t, language } = useLanguage();

  return (
    <View
      className="flex-row items-center justify-around"
      style={{
        height: Platform.OS === 'ios' ? 85 : 70,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        backgroundColor: colors.surface,
        shadowColor: colors.shadow.color,
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: colors.shadow.opacity,
        shadowRadius: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        ...Platform.select({
          android: { elevation: 20 },
          ios: { elevation: 0 }
        })
      }}
    >
      {state.routes.map((route: any, index: any) => {
        const { options } = descriptors[route.key];

        // Translate tab labels
        const getTranslatedLabel = (routeName: string) => {
          switch (routeName) {
            case 'Home': return t('nav.home');
            case 'Map': return t('nav.map');
            case 'Register': return 'Add Business';
            case 'Account': return t('nav.account');
            default: return routeName;
          }
        };

        const label = getTranslatedLabel(route.name);
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const Icon = options.tabBarIcon;

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={{ selected: !!isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            className="items-center justify-center flex-1"
          >
            <View className="p-2.5 rounded-full" style={{ backgroundColor: isFocused ? colors.brand.blue : 'transparent' }}>
              <Icon
                size={22}
                color={isFocused ? colors.text.inverse : colors.brand.dark}
                fill={isFocused ? colors.brand.blue : 'transparent'}
                strokeWidth={isFocused ? 2.5 : 2}
              />
            </View>
            <Text
              className="text-[10px] mt-1 font-outfit"
              style={{
                color: isFocused ? colors.brand.blue : colors.text.secondary,
                ...getTextStyles(language, isFocused)
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Home Stack Navigator
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="BusinessNews" component={BusinessNewsScreen} />
      <Stack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

// Map Stack Navigator
const MapStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={BusinessListScreen} />
      <Stack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
    </Stack.Navigator>
  );
};

// Register Business Stack Navigator
const RegisterStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RegisterMain" component={RegisterBusinessScreen} />
    </Stack.Navigator>
  );
};

// Account Stack Navigator
const AccountStack = ({ session }: { session: Session | null }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain">
        {(props) => <SettingsScreen {...props} session={session} />}
      </Stack.Screen>
      <Stack.Screen name="AccountInfo">
        {(props) => <AccountInfoScreen {...props} session={session} />}
      </Stack.Screen>
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
    </Stack.Navigator>
  );
};

export const MainTabNavigator = ({ session }: { session: Session | null }) => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: (props: any) => <Home {...props} />,
          tabBarLabel: 'Home'
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapStack}
        options={{
          tabBarIcon: (props: any) => <MapIcon {...props} />,
          tabBarLabel: 'Map'
        }}
      />
      <Tab.Screen
        name="Register"
        component={RegisterStack}
        options={{
          tabBarIcon: (props: any) => <PlusCircle {...props} />,
          tabBarLabel: 'Register'
        }}
      />
      <Tab.Screen
        name="Account"
        options={{
          tabBarIcon: (props: any) => <UserIcon {...props} />,
          tabBarLabel: 'Account'
        }}
      >
        {(props) => <AccountStack {...props} session={session} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};
