import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Navigation, Compass, Globe, Filter } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';

const COLOMBO_COORDS = { latitude: 6.9271, longitude: 79.8612 };

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLocationSearch = async (query: string = searchQuery) => {
    setIsLocating(true);
    let lat = COLOMBO_COORDS.latitude;
    let lng = COLOMBO_COORDS.longitude;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLocating(false);
      navigation.navigate('Search', { q: query, lat, lng });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 pt-8 pb-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-bold text-brand-dark font-outfit">Near Me</Text>
          <TouchableOpacity className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <Filter size={20} color="#053765" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <View className="absolute left-4 top-4 z-10">
            <Search size={20} color="#94a3b8" />
          </View>
          <TextInput
            placeholder={isLocating ? "Locating..." : "What are you looking for?"}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleLocationSearch()}
            editable={!isLocating}
            className="bg-white text-gray-900 rounded-2xl py-4 pl-12 pr-4 border border-gray-100 shadow-sm font-outfit"
          />
          {isLocating && (
            <View className="absolute right-4 top-4">
              <ActivityIndicator size="small" color="#053765" />
            </View>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-6">
        <View className="bg-brand-blue rounded-[32px] p-8 mb-8 shadow-lg shadow-brand-blue/20 overflow-hidden">
          <View className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16"></View>
          <Compass size={40} color="white" className="mb-4 opacity-80" />
          <Text className="text-white text-2xl font-bold font-outfit mb-2">Enable Location</Text>
          <Text className="text-white/70 text-sm font-outfit mb-6">Find the best services and businesses exactly where you are.</Text>
          <TouchableOpacity 
            onPress={() => handleLocationSearch()}
            disabled={isLocating}
            className="bg-white rounded-2xl py-4 items-center"
          >
            <Text className="text-brand-blue font-bold font-outfit uppercase tracking-widest text-xs">
              {isLocating ? 'Locating...' : 'Allow Access'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-bold text-brand-dark font-outfit mb-4">Quick Search</Text>
        <View className="flex-row flex-wrap justify-between">
          {[
            { name: 'Pharmacies', icon: Navigation, color: 'text-brand-blue' },
            { name: 'Banks & ATM', icon: Globe, color: 'text-brand-gold' },
            { name: 'Fuel Stations', icon: MapPin, color: 'text-emerald-600' },
          ].map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              onPress={() => handleLocationSearch(item.name)}
              className="bg-white w-[48%] aspect-square rounded-[32px] p-6 mb-4 shadow-sm border border-gray-100 items-center justify-center"
            >
              <View className="bg-gray-50 p-4 rounded-2xl mb-4">
                <item.icon size={24} color={idx === 0 ? "#2a7db4" : idx === 1 ? "#b4863b" : "#10b981"} />
              </View>
              <Text className="font-bold text-gray-900 font-outfit text-center">{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
