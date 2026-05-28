import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Dimensions, StyleSheet, ScrollView, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Star, Filter, Heart, Navigation, Compass, Crosshair, ChevronRight, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { CATEGORY_GROUPS } from '../../data/categories';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';

// Conditional imports for web safety
const MapView = Platform.OS === 'web' ? View : require('react-native-maps').default;
const Marker = Platform.OS === 'web' ? View : require('react-native-maps').Marker;
const PROVIDER_GOOGLE = Platform.OS === 'web' ? undefined : require('react-native-maps').PROVIDER_GOOGLE;

const { width, height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.45;
const COLOMBO_COORDS = { latitude: 6.9271, longitude: 79.8612 };

export const BusinessListScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { q = '', lat: initialLat, lng: initialLng, type, suggestionData, category } = route.params || {};

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>(
    category || (type === 'category' ? q : '')
  );
  const [radius, setRadius] = useState(50000); // 50km default
  const [isLocating, setIsLocating] = useState(false);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>(type === 'business' ? q : '');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [minRating, setMinRating] = useState(0);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const mapRef = useRef<typeof MapView>(null);
  const regionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [region, setRegion] = useState({
    latitude: parseFloat(initialLat) || COLOMBO_COORDS.latitude,
    longitude: parseFloat(initialLng) || COLOMBO_COORDS.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const animateToRegion = (newRegion: any) => {
    if (Platform.OS !== 'web' && mapRef.current) {
      try {
        // @ts-ignore - animateToRegion exists but types might not match
        mapRef.current.animateToRegion(newRegion, 1000); // 1 second animation
      } catch (error) {
        console.log('Could not animate map:', error);
      }
    }
    setRegion(newRegion);
  };


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

      // Apply client-side filters
      let filteredData = data || [];

      if (showVerifiedOnly) {
        filteredData = filteredData.filter((b: any) => b.is_verified);
      }

      if (minRating > 0) {
        filteredData = filteredData.filter((b: any) => b.rating >= minRating);
      }

      // Sort results
      if (sortBy === 'rating') {
        filteredData.sort((a: any, b: any) => b.rating - a.rating);
      } else if (sortBy === 'name') {
        filteredData.sort((a: any, b: any) => a.name.localeCompare(b.name));
      }
      // 'distance' is already sorted by RPC function

      setBusinesses(filteredData);
    } catch (error: any) {
      console.error('Error fetching businesses:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initializeSearch = async () => {
      // Only load businesses if coming from home search (with params)
      if (!q && !initialLat && !type) {
        setLoading(false);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);

      // Case 1: Business search - fetch business location first
      if (type === 'business' && suggestionData?.id) {
        try {
          const { data: businessData } = await supabase
            .from('businesses')
            .select('id, name, latitude, longitude, address, city')
            .eq('id', suggestionData.id)
            .single();

          if (businessData && businessData.latitude && businessData.longitude) {
            const businessRegion = {
              latitude: businessData.latitude,
              longitude: businessData.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            };
            animateToRegion(businessRegion);
            setSearchQuery(businessData.name);

            // Fetch nearby businesses around this specific business
            await fetchBusinesses(
              businessData.latitude,
              businessData.longitude,
              radius,
              businessData.name,
              activeCategory
            );
            return;
          }
        } catch (error) {
          console.error('Error fetching business location:', error);
        }
      }

      // Case 2: Location + Category search (e.g., "Jaffna foods")
      if (type === 'location_category' && initialLat && initialLng) {
        const locationCategoryRegion = {
          latitude: parseFloat(initialLat),
          longitude: parseFloat(initialLng),
          latitudeDelta: 0.15, // Wider view for location-based category search
          longitudeDelta: 0.15,
        };
        animateToRegion(locationCategoryRegion);

        // Fetch businesses with both location and category filter
        await fetchBusinesses(
          parseFloat(initialLat),
          parseFloat(initialLng),
          radius,
          '', // Don't pass search query, let category filter handle it
          activeCategory
        );
        return;
      }

      // Case 3: Town search with coordinates
      if (type === 'town' && initialLat && initialLng) {
        console.log('Town search:', q, 'Coords:', initialLat, initialLng);
        const townRegion = {
          latitude: parseFloat(initialLat),
          longitude: parseFloat(initialLng),
          latitudeDelta: 0.15, // Wider view for towns
          longitudeDelta: 0.15,
        };
        console.log('Setting region to:', townRegion);
        animateToRegion(townRegion);

        // Fetch businesses in this town
        await fetchBusinesses(
          parseFloat(initialLat),
          parseFloat(initialLng),
          radius,
          q, // Town name as search query
          activeCategory
        );
        return;
      }

      // Case 4: Coordinates provided (from town/category with location)
      if (initialLat && initialLng) {
        const providedRegion = {
          latitude: parseFloat(initialLat),
          longitude: parseFloat(initialLng),
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        animateToRegion(providedRegion);

        await fetchBusinesses(
          parseFloat(initialLat),
          parseFloat(initialLng),
          radius,
          searchQuery || q,
          activeCategory
        );
        return;
      }

      // Case 5: No coordinates - try to get current location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });

          // Validate accuracy before using location
          if (location.coords.accuracy && location.coords.accuracy < 50) {
            const userRegion = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            };
            animateToRegion(userRegion);

            await fetchBusinesses(
              location.coords.latitude,
              location.coords.longitude,
              radius,
              searchQuery || q,
              activeCategory
            );
            return;
          } else {
            console.log(`Low GPS accuracy (${location.coords.accuracy}m), using default location`);
          }
        }
      } catch (error) {
        console.log('Auto-location failed, using default location');
      }

      // Case 6: Fallback to default coordinates (Colombo)
      await fetchBusinesses(
        region.latitude,
        region.longitude,
        radius,
        searchQuery || q,
        activeCategory
      );
    };

    initializeSearch();

    return () => {
      // Cleanup timeout on unmount
      if (regionChangeTimeoutRef.current) {
        clearTimeout(regionChangeTimeoutRef.current);
      }
    };
  }, [q, activeCategory, radius, type, suggestionData, sortBy, minRating, showVerifiedOnly]);

  const onRegionChangeComplete = (newRegion: any) => {
    setRegion(newRegion);
    // Show "Search this area" button instead of auto-fetching
    setShowSearchThisArea(true);
  };

  const searchThisArea = () => {
    fetchBusinesses(region.latitude, region.longitude, radius, searchQuery || q, activeCategory);
    setShowSearchThisArea(false);
  };

  const findMe = async () => {
    if (isLocating) return; // Prevent multiple simultaneous requests

    setIsLocating(true);
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'We need your location permission to show nearby businesses. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        setIsLocating(false);
        return;
      }

      // Get highest accuracy current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const accuracy = location.coords.accuracy || 999;

      // Check accuracy quality and provide appropriate feedback
      if (accuracy > 100) {
        // Very poor accuracy
        Alert.alert(
          'Poor GPS Signal',
          `GPS accuracy is very low (${accuracy.toFixed(0)}m).\n\nFor better results:\n• Move outdoors to an open area\n• Enable High Accuracy mode\n• Turn on Wi-Fi\n• Wait a few seconds\n\nUse this location anyway?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsLocating(false) },
            { text: 'Use Anyway', onPress: () => updateLocationAndFetch(location) }
          ]
        );
      } else if (accuracy > 50) {
        // Moderate accuracy - use with warning
        updateLocationAndFetch(location);
        // Show toast-like feedback (non-blocking)
        setTimeout(() => {
          Alert.alert(
            'Moderate GPS Accuracy',
            `Location accuracy: ${accuracy.toFixed(0)}m\n\nFor better precision, move to an open area and enable High Accuracy mode.`,
            [{ text: 'Got it' }]
          );
        }, 500);
      } else {
        // Good accuracy
        updateLocationAndFetch(location);
      }

    } catch (error: any) {
      console.error('Error finding user location:', error);

      // Show user-friendly error message
      let errorTitle = 'Location Error';
      let errorMessage = 'Unable to get your current location.\n\n';

      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorTitle = 'Location Services Disabled';
        errorMessage += 'Please enable Location Services in your device settings:\n\nSettings → Location → Turn ON';
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        errorTitle = 'Location Timeout';
        errorMessage += 'The request took too long. Please:\n• Check your GPS signal\n• Move to an open area\n• Try again';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorTitle = 'Location Unavailable';
        errorMessage += 'Location is temporarily unavailable. Please check:\n• Location is enabled\n• GPS signal is available\n• Try again in a moment';
      } else {
        errorMessage += 'Please check your location settings and try again.';
      }

      Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
      setIsLocating(false);
    }
  };

  const updateLocationAndFetch = (location: Location.LocationObject) => {
    const newRegion = {
      ...region,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05, // Appropriate zoom level
      longitudeDelta: 0.05,
    };

    // Animate to user's location
    animateToRegion(newRegion);

    // Fetch businesses at current location
    fetchBusinesses(
      location.coords.latitude,
      location.coords.longitude,
      radius,
      searchQuery || q,
      activeCategory
    );

    // Reset loading state and hide search button
    setIsLocating(false);
    setShowSearchThisArea(false);
  };

  const handleBusinessPress = (item: any) => {
    const params: any = { businessId: item.id };
    if (item.slug) {
      params.businessSlug = item.slug;
    }
    navigation.navigate('BusinessDetails' as never, params as never);
  };

  const renderBusinessItem = ({ item }: { item: any }) => {
    const isExpanded = expandedCardId === item.id;

    return (
      <TouchableOpacity
        onPress={() => {
          if (isExpanded) {
            handleBusinessPress(item);
          } else {
            setExpandedCardId(item.id);
          }
        }}
        className="rounded-3xl overflow-hidden mb-4 shadow-sm p-4 mx-6"
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: isExpanded ? colors.brand.blue : colors.border
        }}
      >
        <View className="flex-row items-center">
          <Image
            source={{ uri: item.image_url || item.logo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' }}
            className="w-20 h-20 rounded-2xl"
            style={{ backgroundColor: colors.input.background }}
          />
          <View className="flex-1 ml-4 py-1">
            <View className="flex-row justify-between items-start">
              <Text className="text-[10px] font-bold uppercase tracking-widest font-outfit mb-1" numberOfLines={1} style={{ color: colors.brand.blue }}>
                {item.category || 'General'}
              </Text>
              <View className="flex-row items-center">
                <Star size={10} color={colors.brand.gold} fill={colors.brand.gold} />
                <Text className="text-[10px] font-bold ml-1 font-outfit" style={{ color: colors.brand.gold }}>{item.rating || '4.5'}</Text>
              </View>
            </View>
            <Text className="text-sm font-bold font-outfit mb-1 leading-tight" numberOfLines={1} style={{ color: colors.brand.dark }}>{item.name}</Text>
            <View className="flex-row items-center">
              <MapPin size={10} color={colors.text.tertiary} />
              <Text className="text-[10px] ml-1 font-outfit" numberOfLines={1} style={{ color: colors.text.tertiary }}>
                {(item.distance_meters / 1000).toFixed(1)} km · {item.city || 'Sri Lanka'}
              </Text>
            </View>
          </View>
        </View>

        {isExpanded && (
          <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            {item.address && (
              <View className="flex-row items-start mb-2">
                <MapPin size={14} color={colors.text.secondary} />
                <Text className="text-xs ml-2 flex-1 font-outfit" style={{ color: colors.text.secondary }}>
                  {item.address}
                </Text>
              </View>
            )}
            {item.phone && (
              <View className="flex-row items-center mb-2">
                <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                  📞 {item.phone}
                </Text>
              </View>
            )}
            {item.description && (
              <Text className="text-xs mt-2 font-outfit" numberOfLines={3} style={{ color: colors.text.secondary }}>
                {item.description}
              </Text>
            )}
            <View className="flex-row items-center justify-between mt-3">
              <Text className="text-xs font-bold font-outfit" style={{ color: colors.brand.blue }}>
                Tap again to view details
              </Text>
              <ChevronRight size={16} color={colors.brand.blue} />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: colors.background }}>
      {/* Header & Filters */}
      <View className="z-50" style={{ backgroundColor: colors.surface }}>
        <View className="px-6 py-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-xl font-bold font-outfit" style={{ color: colors.brand.dark }}>
                Nearby Businesses
              </Text>
              {businesses.length > 0 && suggestionData?.name && (
                <Text className="text-xs font-outfit mt-0.5" style={{ color: colors.text.tertiary }}>
                  Near {suggestionData.name}
                </Text>
              )}
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={findMe}
                disabled={isLocating}
                className="px-4 py-2 rounded-full mr-2 flex-row items-center shadow-sm"
                style={{ backgroundColor: colors.brand.blue, opacity: isLocating ? 0.6 : 1 }}
                activeOpacity={0.7}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Navigation size={14} color="#FFFFFF" />
                    <Text className="text-xs font-bold font-outfit ml-1.5" style={{ color: '#FFFFFF' }}>
                      Find Me
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="p-2 rounded-full relative"
                style={{ backgroundColor: colors.input.background }}
                onPress={() => setShowFilterModal(true)}
              >
                <Filter size={20} color={colors.brand.dark} />
                {(showVerifiedOnly || minRating > 0 || sortBy !== 'distance') && (
                  <View className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <TouchableOpacity
              onPress={() => setActiveCategory('')}
              className="px-4 py-2 rounded-full mr-2"
              style={{
                backgroundColor: activeCategory === '' ? colors.brand.blue : colors.surface,
                borderWidth: 1,
                borderColor: activeCategory === '' ? colors.brand.blue : colors.border
              }}
            >
              <Text className="text-xs font-bold font-outfit" style={{ color: activeCategory === '' ? '#FFFFFF' : colors.text.secondary }}>All</Text>
            </TouchableOpacity>
            {CATEGORY_GROUPS.map((group) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => setActiveCategory(group.name)}
                className="px-4 py-2 rounded-full mr-2"
                style={{
                  backgroundColor: activeCategory === group.name ? colors.brand.blue : colors.surface,
                  borderWidth: 1,
                  borderColor: activeCategory === group.name ? colors.brand.blue : colors.border
                }}
              >
                <Text className="text-xs font-bold font-outfit" style={{ color: activeCategory === group.name ? '#FFFFFF' : colors.text.secondary }}>{group.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Map View */}
      <View style={{ height: MAP_HEIGHT }} className="relative">
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.input.background, borderBottomWidth: 1, borderBottomColor: colors.border }]} className="items-center justify-center">
            <View className="p-6 rounded-[40px] items-center shadow-sm" style={{ backgroundColor: colors.surface }}>
              <Compass size={48} color={colors.brand.dark} strokeWidth={1.5} />
              <Text className="font-bold font-outfit mt-4 text-lg" style={{ color: colors.brand.dark }}>Map View</Text>
              <Text className="text-sm font-outfit text-center px-10 mt-1" style={{ color: colors.text.secondary }}>
                The interactive map is optimized for mobile devices.
                Listing results are available below.
              </Text>
            </View>
          </View>
        ) : (
          <MapView
            key={`${region.latitude}-${region.longitude}`}
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={region}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={false}
            loadingEnabled={true}
            loadingIndicatorColor={colors.brand.blue}
          >
            {businesses.map((biz) => (
              <Marker
                key={biz.id}
                coordinate={{ latitude: biz.latitude, longitude: biz.longitude }}
                onPress={() => setSelectedBusiness(biz)}
              >
                <View className="p-2 rounded-full border-2 shadow-lg" style={{
                  backgroundColor: selectedBusiness?.id === biz.id ? colors.brand.gold : colors.brand.blue,
                  borderColor: '#FFFFFF'
                }}>
                  <MapPin size={16} color="#FFFFFF" />
                </View>
              </Marker>
            ))}
          </MapView>
        )}

        {/* Search This Area Button */}
        {showSearchThisArea && Platform.OS !== 'web' && (
          <TouchableOpacity
            onPress={searchThisArea}
            className="absolute top-4 self-center px-6 py-3 rounded-full shadow-2xl flex-row items-center"
            style={{ backgroundColor: colors.brand.dark, borderWidth: 2, borderColor: '#FFFFFF' }}
            activeOpacity={0.8}
          >
            <Search size={16} color="#FFFFFF" />
            <Text className="text-sm font-bold font-outfit ml-2" style={{ color: '#FFFFFF' }}>
              Search this area
            </Text>
          </TouchableOpacity>
        )}

        {/* Selected Business Preview Card */}
        {!!selectedBusiness && (
          <TouchableOpacity
            onPress={() => handleBusinessPress(selectedBusiness)}
            className="absolute bottom-6 left-6 right-20 rounded-3xl shadow-2xl p-4 flex-row items-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: selectedBusiness.image_url || selectedBusiness.logo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' }}
              className="w-16 h-16 rounded-2xl"
              style={{ backgroundColor: colors.input.background }}
            />
            <View className="flex-1 ml-3 pr-2">
              <Text className="text-sm font-bold font-outfit mb-0.5" numberOfLines={1} style={{ color: colors.brand.dark }}>{selectedBusiness.name}</Text>
              <View className="flex-row items-center">
                <Star size={10} color={colors.brand.gold} fill={colors.brand.gold} />
                <Text className="text-[10px] font-bold ml-1 font-outfit" style={{ color: colors.brand.gold }}>{selectedBusiness.rating || '4.5'}</Text>
                <Text className="text-[10px] ml-2 font-outfit truncate" numberOfLines={1} style={{ color: colors.text.tertiary }}>
                  · {(selectedBusiness.distance_meters / 1000).toFixed(1)} km away
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setSelectedBusiness(null);
              }}
              className="p-1"
            >
              <X size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </View>

      {/* List View */}
      <View className="flex-1 -mt-6 rounded-t-[40px] shadow-2xl pt-6" style={{ backgroundColor: colors.background }}>
        <View className="px-8 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold font-outfit" style={{ color: colors.brand.dark }}>Results ({businesses.length})</Text>
            <Text className="text-[10px] font-bold uppercase font-outfit tracking-widest" style={{ color: colors.brand.blue }}>Select Radius</Text>
          </View>
          <View className="flex-row">
            {[5, 10, 25, 50].map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRadius(r * 1000)}
                className="px-4 py-1.5 rounded-xl mr-2"
                style={{
                  backgroundColor: radius === r * 1000 ? colors.brand.blue : colors.surface,
                  borderWidth: 1,
                  borderColor: radius === r * 1000 ? colors.brand.blue : colors.border
                }}
              >
                <Text className="text-[10px] font-bold font-outfit" style={{ color: radius === r * 1000 ? '#FFFFFF' : colors.text.tertiary }}>
                  {r}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!hasSearched ? (
          <View className="flex-1 justify-center items-center pb-20 px-8">
            <Search size={64} color={colors.text.tertiary} strokeWidth={1.5} />
            <Text className="text-xl font-bold font-outfit mt-6 text-center" style={{ color: colors.brand.dark }}>
              Search for Businesses
            </Text>
            <Text className="text-sm font-outfit text-center mt-2 px-4" style={{ color: colors.text.secondary }}>
              Try searching "Jaffna foods", "Colombo hotels", or any business name
            </Text>
            <TouchableOpacity
              onPress={findMe}
              disabled={isLocating}
              className="mt-6 px-6 py-3 rounded-full flex-row items-center"
              style={{ backgroundColor: colors.brand.blue }}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Navigation size={18} color="#FFFFFF" />
                  <Text className="text-sm font-bold font-outfit ml-2" style={{ color: '#FFFFFF' }}>
                    Find Nearby Businesses
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : loading && businesses.length === 0 ? (
          <View className="flex-1 justify-center items-center pb-20">
            <ActivityIndicator color={colors.brand.dark} />
          </View>
        ) : (
          <FlatList
            data={businesses}
            renderItem={renderBusinessItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 140 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  fetchBusinesses(region.latitude, region.longitude, radius, q, activeCategory);
                  setShowSearchThisArea(false);
                }}
              />
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center pt-20">
                <Text className="font-outfit" style={{ color: colors.text.tertiary }}>No businesses found nearby</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl pb-8" style={{ maxHeight: '80%' }}>
            {/* Header */}
            <View className="p-6 border-b border-gray-100 flex-row items-center justify-between">
              <Text className="text-2xl font-bold font-outfit" style={{ color: colors.text.primary }}>
                Filters
              </Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                className="w-10 h-10 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.input.background }}
              >
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
              {/* Sort By */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-3 font-outfit" style={{ color: colors.text.primary }}>
                  Sort By
                </Text>
                <View className="space-y-2">
                  {[
                    { value: 'distance', label: 'Distance', icon: Navigation },
                    { value: 'rating', label: 'Highest Rated', icon: Star },
                    { value: 'name', label: 'Name (A-Z)', icon: Filter }
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setSortBy(option.value as any)}
                        className="flex-row items-center p-4 rounded-xl border"
                        style={{
                          backgroundColor: sortBy === option.value ? colors.brand.blue + '10' : colors.surface,
                          borderColor: sortBy === option.value ? colors.brand.blue : colors.border
                        }}
                      >
                        <Icon
                          size={20}
                          color={sortBy === option.value ? colors.brand.blue : colors.text.tertiary}
                        />
                        <Text
                          className="ml-3 font-bold font-outfit"
                          style={{
                            color: sortBy === option.value ? colors.brand.blue : colors.text.primary
                          }}
                        >
                          {option.label}
                        </Text>
                        {sortBy === option.value && (
                          <View className="ml-auto">
                            <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: colors.brand.blue }}>
                              <Text className="text-white text-xs">✓</Text>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Distance Radius */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-3 font-outfit" style={{ color: colors.text.primary }}>
                  Search Radius
                </Text>
                <View className="flex-row flex-wrap">
                  {[5, 10, 25, 50, 100].map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRadius(r * 1000)}
                      className="px-6 py-3 rounded-xl mr-2 mb-2"
                      style={{
                        backgroundColor: radius === r * 1000 ? colors.brand.blue : colors.surface,
                        borderWidth: 1,
                        borderColor: radius === r * 1000 ? colors.brand.blue : colors.border
                      }}
                    >
                      <Text
                        className="text-sm font-bold font-outfit"
                        style={{ color: radius === r * 1000 ? '#FFFFFF' : colors.text.secondary }}
                      >
                        {r}km
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Minimum Rating */}
              <View className="mb-6">
                <Text className="text-sm font-bold mb-3 font-outfit" style={{ color: colors.text.primary }}>
                  Minimum Rating
                </Text>
                <View className="flex-row flex-wrap">
                  {[0, 3, 4, 4.5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      onPress={() => setMinRating(rating)}
                      className="px-6 py-3 rounded-xl mr-2 mb-2 flex-row items-center"
                      style={{
                        backgroundColor: minRating === rating ? colors.brand.gold + '20' : colors.surface,
                        borderWidth: 1,
                        borderColor: minRating === rating ? colors.brand.gold : colors.border
                      }}
                    >
                      <Star
                        size={16}
                        fill={minRating === rating ? colors.brand.gold : 'transparent'}
                        color={minRating === rating ? colors.brand.gold : colors.text.tertiary}
                      />
                      <Text
                        className="ml-2 text-sm font-bold font-outfit"
                        style={{
                          color: minRating === rating ? colors.brand.gold : colors.text.secondary
                        }}
                      >
                        {rating === 0 ? 'Any' : `${rating}+`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Verified Only */}
              <View className="mb-6">
                <TouchableOpacity
                  onPress={() => setShowVerifiedOnly(!showVerifiedOnly)}
                  className="flex-row items-center p-4 rounded-xl border"
                  style={{
                    backgroundColor: showVerifiedOnly ? colors.brand.blue + '10' : colors.surface,
                    borderColor: showVerifiedOnly ? colors.brand.blue : colors.border
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-md border-2 items-center justify-center mr-3"
                    style={{
                      backgroundColor: showVerifiedOnly ? colors.brand.blue : 'transparent',
                      borderColor: showVerifiedOnly ? colors.brand.blue : colors.border
                    }}
                  >
                    {showVerifiedOnly && <Text className="text-white font-bold text-xs">✓</Text>}
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold font-outfit" style={{ color: colors.text.primary }}>
                      Verified Businesses Only
                    </Text>
                    <Text className="text-xs mt-1 font-outfit" style={{ color: colors.text.tertiary }}>
                      Show only businesses with verified badge
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                onPress={() => {
                  setSortBy('distance');
                  setMinRating(0);
                  setShowVerifiedOnly(false);
                  setRadius(50000);
                }}
                className="py-3 rounded-xl mb-2 border"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border
                }}
              >
                <Text className="text-center font-bold font-outfit" style={{ color: colors.text.secondary }}>
                  Reset All Filters
                </Text>
              </TouchableOpacity>

              {/* Apply Button */}
              <TouchableOpacity
                onPress={() => {
                  setShowFilterModal(false);
                  fetchBusinesses(region.latitude, region.longitude, radius, searchQuery || q, activeCategory);
                }}
                className="py-4 rounded-xl mt-2"
                style={{ backgroundColor: colors.brand.dark }}
              >
                <Text className="text-center text-white font-bold text-lg font-outfit">
                  Apply Filters ({businesses.length} results)
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Add Business Button */}
      <TouchableOpacity
        onPress={() => {
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('Register');
          }
        }}
        className="absolute bottom-8 right-6 shadow-2xl flex-row items-center px-5 py-4 rounded-full"
        style={{
          backgroundColor: colors.brand.dark,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8
        }}
        activeOpacity={0.9}
      >
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-full items-center justify-center mr-2" style={{ backgroundColor: colors.brand.gold }}>
            <Text className="text-white font-bold text-sm">+</Text>
          </View>
          <Text className="text-white font-bold text-sm font-outfit">Add Business</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};
