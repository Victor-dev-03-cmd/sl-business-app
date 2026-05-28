import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Navigation, Compass, Globe, Filter } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';

const COLOMBO_COORDS = { latitude: 6.9271, longitude: 79.8612 };

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();
  const colors = Colors[theme];

  const handleLocationSearch = async (query: string = searchQuery) => {
    setIsLocating(true);
    let lat = COLOMBO_COORDS.latitude;
    let lng = COLOMBO_COORDS.longitude;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        // Validate accuracy before using location
        if (location.coords.accuracy && location.coords.accuracy < 50) {
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        } else {
          console.log(`Low GPS accuracy (${location.coords.accuracy}m), using default coordinates`);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLocating(false);
      navigation.navigate('Search', { q: query, lat, lng });
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}>
      <View className="px-6 pt-8 pb-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-bold font-outfit" style={{ color: colors.brand.dark }}>Near Me</Text>
          <TouchableOpacity className="p-3 rounded-2xl shadow-sm border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <Filter size={20} color={colors.brand.dark} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <View className="absolute left-4 top-4 z-10">
            <Search size={20} color={colors.input.placeholder} />
          </View>
          <TextInput
            placeholder={isLocating ? "Locating..." : "What are you looking for?"}
            placeholderTextColor={colors.input.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleLocationSearch()}
            editable={!isLocating}
            className="rounded-2xl py-4 pl-12 pr-4 border shadow-sm font-outfit"
            style={{ backgroundColor: colors.surface, color: colors.text.primary, borderColor: colors.border }}
          />
          {isLocating && (
            <View className="absolute right-4 top-4">
              <ActivityIndicator size="small" color={colors.brand.dark} />
            </View>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-6">
        <View className="rounded-[32px] p-8 mb-8 shadow-lg overflow-hidden" style={{ backgroundColor: colors.brand.blue }}>
          <View className="absolute top-0 right-0 w-48 h-48 rounded-full -mr-16 -mt-16" style={{ backgroundColor: colors.text.inverse + '10' }}></View>
          <Compass size={40} color={colors.text.inverse} className="mb-4 opacity-80" />
          <Text className="text-2xl font-bold font-outfit mb-2" style={{ color: colors.text.inverse }}>Enable Location</Text>
          <Text className="text-sm font-outfit mb-6" style={{ color: colors.text.inverse, opacity: 0.7 }}>Find the best services and businesses exactly where you are.</Text>
          <TouchableOpacity
            onPress={() => handleLocationSearch()}
            disabled={isLocating}
            className="rounded-2xl py-4 items-center"
            style={{ backgroundColor: colors.text.inverse }}
          >
            <Text className="font-bold font-outfit uppercase tracking-widest text-xs" style={{ color: colors.brand.blue }}>
              {isLocating ? 'Locating...' : 'Allow Access'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-bold font-outfit mb-4" style={{ color: colors.brand.dark }}>Quick Search</Text>
        <View className="flex-row flex-wrap justify-between">
          {[
            { name: 'Pharmacies', icon: Navigation, color: colors.brand.blue },
            { name: 'Banks & ATM', icon: Globe, color: colors.brand.gold },
            { name: 'Fuel Stations', icon: MapPin, color: colors.success },
          ].map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleLocationSearch(item.name)}
              className="w-[48%] aspect-square rounded-[32px] p-6 mb-4 shadow-sm border items-center justify-center"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <View className="p-4 rounded-2xl mb-4" style={{ backgroundColor: colors.input.background }}>
                <item.icon size={24} color={item.color} />
              </View>
              <Text className="font-bold font-outfit text-center" style={{ color: colors.text.primary }}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
