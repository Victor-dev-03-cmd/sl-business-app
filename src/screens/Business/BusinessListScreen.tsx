import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Dimensions, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Star, Filter, Heart, Navigation, Compass, Crosshair, ChevronRight, X } from 'lucide-react-native';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { CATEGORY_GROUPS } from '../../data/categories';
import { useRoute } from '@react-navigation/native';

// Conditional imports for web safety
const MapView = Platform.OS === 'web' ? View : require('react-native-maps').default;
const Marker = Platform.OS === 'web' ? View : require('react-native-maps').Marker;
const PROVIDER_GOOGLE = Platform.OS === 'web' ? undefined : require('react-native-maps').PROVIDER_GOOGLE;

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.45;
const COLOMBO_COORDS = { latitude: 6.9271, longitude: 79.8612 };

export const BusinessListScreen = () => {
  const route = useRoute<any>();
  const { q = '', lat: initialLat, lng: initialLng, type } = route.params || {};

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>(type === 'category' ? q : '');
  const [radius, setRadius] = useState(50000); // 50km default
  const [isLocating, setIsLocating] = useState(false);
  
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: parseFloat(initialLat) || COLOMBO_COORDS.latitude,
    longitude: parseFloat(initialLng) || COLOMBO_COORDS.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const fetchBusinesses = async (centerLat: number, centerLng: number, currentRadius: number, query: string, category: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_nearby_businesses', {
        user_lat: centerLat,
        user_lng: centerLng,
        search_query: query,
        dist_limit: currentRadius,
        category_filter: category
      });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error: any) {
      console.error('Error fetching businesses:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBusinesses(region.latitude, region.longitude, radius, q, activeCategory);
  }, [q, activeCategory, radius]);

  const onRegionChangeComplete = (newRegion: any) => {
    setRegion(newRegion);
    // Fetch businesses when user moves the map
    fetchBusinesses(newRegion.latitude, newRegion.longitude, radius, q, activeCategory);
  };

  const findMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const newRegion = {
          ...region,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        if (Platform.OS !== 'web') {
          mapRef.current?.animateToRegion(newRegion, 1000);
        } else {
          setRegion(newRegion);
        }
      }
    } catch (error) {
      console.error('Error finding user location:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const renderBusinessItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => setSelectedBusiness(item)}
      className="bg-white rounded-3xl overflow-hidden mb-4 shadow-sm border border-gray-100 p-4 flex-row items-center mx-6"
    >
      <Image 
        source={{ uri: item.image_url || item.logo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' }} 
        className="w-20 h-20 rounded-2xl bg-gray-100" 
      />
      <View className="flex-1 ml-4 py-1">
        <View className="flex-row justify-between items-start">
          <Text className="text-brand-blue text-[10px] font-bold uppercase tracking-widest font-outfit mb-1" numberOfLines={1}>
            {item.category || 'General'}
          </Text>
          <View className="flex-row items-center">
            <Star size={10} color="#b4863b" fill="#b4863b" />
            <Text className="text-brand-gold text-[10px] font-bold ml-1 font-outfit">{item.rating || '4.5'}</Text>
          </View>
        </View>
        <Text className="text-sm font-bold text-brand-dark font-outfit mb-1 leading-tight" numberOfLines={1}>{item.name}</Text>
        <View className="flex-row items-center">
          <MapPin size={10} color="#94a3b8" />
          <Text className="text-gray-400 text-[10px] ml-1 font-outfit" numberOfLines={1}>
            {(item.distance_meters / 1000).toFixed(1)} km · {item.city || 'Sri Lanka'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header & Filters */}
      <SafeAreaView edges={['top']} className="bg-white z-50">
        <View className="px-6 py-4 border-b border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-brand-dark font-outfit">
              {q ? `Nearby "${q}"` : 'Nearby Businesses'}
            </Text>
            <TouchableOpacity className="p-2 bg-gray-50 rounded-full">
              <Filter size={20} color="#053765" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <TouchableOpacity 
              onPress={() => setActiveCategory('')}
              className={`px-4 py-2 rounded-full mr-2 border ${activeCategory === '' ? 'bg-brand-blue border-brand-blue' : 'bg-white border-gray-200'}`}
            >
              <Text className={`text-xs font-bold font-outfit ${activeCategory === '' ? 'text-white' : 'text-gray-500'}`}>All</Text>
            </TouchableOpacity>
            {CATEGORY_GROUPS.map((group) => (
              <TouchableOpacity 
                key={group.id}
                onPress={() => setActiveCategory(group.name)}
                className={`px-4 py-2 rounded-full mr-2 border ${activeCategory === group.name ? 'bg-brand-blue border-brand-blue' : 'bg-white border-gray-200'}`}
              >
                <Text className={`text-xs font-bold font-outfit ${activeCategory === group.name ? 'text-white' : 'text-gray-500'}`}>{group.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Map View */}
      <View style={{ height: MAP_HEIGHT }} className="relative">
        {Platform.OS === 'web' ? (
          <View style={StyleSheet.absoluteFillObject} className="bg-blue-50 items-center justify-center border-b border-blue-100">
            <View className="bg-white p-6 rounded-[40px] items-center shadow-sm">
              <Compass size={48} color="#053765" strokeWidth={1.5} />
              <Text className="text-brand-dark font-bold font-outfit mt-4 text-lg">Map View</Text>
              <Text className="text-gray-500 text-sm font-outfit text-center px-10 mt-1">
                The interactive map is optimized for mobile devices. 
                Listing results are available below.
              </Text>
            </View>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {businesses.map((biz) => (
              <Marker
                key={biz.id}
                coordinate={{ latitude: biz.latitude, longitude: biz.longitude }}
                onPress={() => setSelectedBusiness(biz)}
              >
                <View className={`p-2 rounded-full border-2 ${selectedBusiness?.id === biz.id ? 'bg-brand-gold border-white' : 'bg-brand-blue border-white shadow-lg'}`}>
                  <MapPin size={16} color="white" />
                </View>
              </Marker>
            ))}
          </MapView>
        )}

        {/* Find Me FAB */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity 
            onPress={findMe}
            className="absolute right-6 bottom-6 bg-white p-3 rounded-full shadow-xl border border-gray-100"
          >
            {isLocating ? <ActivityIndicator size="small" color="#053765" /> : <Compass size={24} color="#053765" />}
          </TouchableOpacity>
        )}

        {/* Selected Business Preview Card */}
        {!!selectedBusiness && (
          <View className="absolute bottom-6 left-6 right-20 bg-white rounded-3xl shadow-2xl p-4 flex-row items-center border border-gray-100">
            <Image 
              source={{ uri: selectedBusiness.image_url || selectedBusiness.logo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' }} 
              className="w-16 h-16 rounded-2xl bg-gray-100" 
            />
            <View className="flex-1 ml-3 pr-2">
              <Text className="text-sm font-bold text-brand-dark font-outfit mb-0.5" numberOfLines={1}>{selectedBusiness.name}</Text>
              <View className="flex-row items-center">
                <Star size={10} color="#b4863b" fill="#b4863b" />
                <Text className="text-brand-gold text-[10px] font-bold ml-1 font-outfit">{selectedBusiness.rating || '4.5'}</Text>
                <Text className="text-gray-400 text-[10px] ml-2 font-outfit truncate" numberOfLines={1}>
                  · {(selectedBusiness.distance_meters / 1000).toFixed(1)} km away
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedBusiness(null)} className="p-1">
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List View */}
      <View className="flex-1 -mt-6 bg-gray-50 rounded-t-[40px] shadow-2xl pt-6">
        <View className="px-8 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold text-brand-dark font-outfit">Results ({businesses.length})</Text>
            <Text className="text-brand-blue text-[10px] font-bold uppercase font-outfit tracking-widest">Select Radius</Text>
          </View>
          <View className="flex-row">
            {[5, 10, 25, 50].map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRadius(r * 1000)}
                className={`px-4 py-1.5 rounded-xl mr-2 border ${radius === r * 1000 ? 'bg-brand-blue border-brand-blue' : 'bg-white border-gray-100'}`}
              >
                <Text className={`text-[10px] font-bold font-outfit ${radius === r * 1000 ? 'text-white' : 'text-gray-400'}`}>
                  {r}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading && businesses.length === 0 ? (
          <View className="flex-1 justify-center items-center pb-20">
            <ActivityIndicator color="#053765" />
          </View>
        ) : (
          <FlatList
            data={businesses}
            renderItem={renderBusinessItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchBusinesses(region.latitude, region.longitude, radius, q, activeCategory)} />
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center pt-20">
                <Text className="text-gray-400 font-outfit">No businesses found nearby</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};
