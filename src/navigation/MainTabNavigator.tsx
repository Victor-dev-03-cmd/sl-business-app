import React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Map as MapIcon, Search, User as UserIcon } from 'lucide-react-native';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { SearchScreen } from '../screens/Search/SearchScreen';
import { BusinessListScreen } from '../screens/Business/BusinessListScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { Session } from '@supabase/supabase-js';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View 
      className="flex-row bg-white h-20 items-center justify-around pb-2"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        ...Platform.select({
          android: { elevation: 20 },
          ios: { elevation: 0 }
        })
      }}
    >
      {state.routes.map((route: any, index: any) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

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
            className="items-center justify-center flex-1 py-2"
          >
            <View className={`p-2 rounded-[50%] ${isFocused ? 'bg-brand-blue' : 'transparent'}`}>
              <Icon 
                size={22} 
                color={isFocused ? 'white' : '#053765'} 
                fill={isFocused ? '#2a7db4' : '#ffffff'} 
                strokeWidth={isFocused ? 2.5 : 2}
              />
            </View>
            <Text className={`text-[11px] mt-1 font-outfit ${isFocused ? 'text-brand-dark' : 'text-brand-dark'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
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
        component={HomeScreen} 
        options={{
          tabBarIcon: (props: any) => <Home {...props} />,
          tabBarLabel: 'Home'
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={SearchScreen} 
        options={{
          tabBarIcon: (props: any) => <MapIcon {...props} />,
          tabBarLabel: 'Map'
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={BusinessListScreen} 
        options={{
          tabBarIcon: (props: any) => <Search {...props} />,
          tabBarLabel: 'Search'
        }}
      />
      <Tab.Screen 
        name="Account" 
        options={{
          tabBarIcon: (props: any) => <UserIcon {...props} />,
          tabBarLabel: 'Account'
        }}
      >
        {(props) => <SettingsScreen {...props} session={session} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};
