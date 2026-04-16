import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList, Keyboard, Modal, Pressable, Dimensions, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell, User, ScanLine, Package, Star, MapPin, ChevronRight, ArrowLeft, Globe, BookOpenText, Settings, Newspaper, Tags, Briefcase } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { CATEGORY_GROUPS, CategoryGroup } from '../../data/categories';
import Fuse from 'fuse.js';
import townsData from '../../data/sri-lanka-towns.json';

import * as Location from 'expo-location';
import { useNavigation, NavigationContainer } from '@react-navigation/native';

const COLOMBO_COORDS = { latitude: 6.9271, longitude: 79.8612 };

interface SearchSuggestion {
  id: string;
  name: string;
  type: 'town' | 'category' | 'business';
  subtitle?: string;
  business_name?: string;
  category_name?: string;
  town_name?: string;
  data?: any;
}

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [searchData, setSearchData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [bizLoading, setBizLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup | null>(null);
  const [dynamicSubcategories, setDynamicSubcategories] = useState<Record<string, any[]>>({});
  const [userName, setUserName] = useState<string>('Guest');

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Pre-indexing searchable items with useMemo
  const searchableItems = useMemo(() => {
    const uniqueCategories = Array.from(new Set(CATEGORY_GROUPS.flatMap(g => [g.name, ...g.subcategories])));
    const uniqueTowns = Array.from(new Set((townsData as any[]).map(t => t.name)));

    return [
      ...searchData.map(b => ({ 
        id: `biz-${b.id}-${b.name}`, 
        name: b.name, 
        business_name: b.name,
        type: 'business' as const, 
        subtitle: b.city || (b.address ? b.address.split(',')[0] : undefined),
        data: b 
      })),
      ...uniqueCategories.map((c, index) => ({ 
        id: `cat-${index}-${c}`, 
        name: c, 
        category_name: c, 
        type: 'category' as const 
      })),
      ...uniqueTowns.map((t, index) => ({ 
        id: `town-${index}-${t}`, 
        name: t, 
        town_name: t, 
        type: 'town' as const 
      }))
    ];
  }, [searchData]);

  // Initialize Fuse instance only once or when searchableItems change
  const fuse = useMemo(() => {
    return new Fuse(searchableItems, {
      keys: [
        { name: 'business_name', weight: 1.0 },
        { name: 'name', weight: 0.9 },
        { name: 'category_name', weight: 0.8 },
        { name: 'town_name', weight: 0.8 }
      ],
      threshold: 0.3,
      distance: 100,
      ignoreLocation: true,
    });
  }, [searchableItems]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchUserProfile();
    fetchFeaturedBusinesses();
    fetchAllBusinessesForSearch();
    fetchCategories();
  }, []);

  const handleSearch = async (suggestion?: SearchSuggestion) => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setIsSearchingLocation(true);

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
      setIsSearchingLocation(false);
      InteractionManager.runAfterInteractions(() => {
        navigation.navigate('Search', {
          q: suggestion?.name || searchQuery,
          lat,
          lng,
          type: suggestion?.type,
          suggestionData: suggestion?.data,
        });
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (data) {
        setCategories(data);
        
        // Find the 8 main groups in the fetched data to get their DB IDs
        const mainGroupsFromDb = data.filter(c => !c.parent_id);
        const subMapping: Record<string, any[]> = {};
        
        CATEGORY_GROUPS.forEach(group => {
          const dbGroup = mainGroupsFromDb.find(dbg => dbg.name === group.name);
          if (dbGroup) {
            subMapping[group.id] = data.filter(c => c.parent_id === dbGroup.id);
          } else {
            subMapping[group.id] = [];
          }
        });
        
        setDynamicSubcategories(subMapping);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCatLoading(false);
    }
  };

  const fetchAllBusinessesForSearch = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, description, city, address, logo_url, image_url')
        .eq('status', 'approved');
      
      if (data) {
        setSearchData(data);
      }
    } catch (error) {
      console.error('Error fetching all businesses:', error);
    }
  };

  useEffect(() => {
    if (debouncedSearchQuery.length > 1 && fuse) {
      const results = fuse.search(debouncedSearchQuery).slice(0, 15);
      setSuggestions(results.map((r: any) => r.item));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchQuery, fuse]);

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    Keyboard.dismiss(); // Immediate keyboard dismiss to free UI resources
    setSearchQuery(suggestion.name);
    
    // Defer navigation until animations finish
    InteractionManager.runAfterInteractions(() => {
      handleSearch(suggestion);
    });
  };

  const renderSuggestion = useCallback(({ item }: { item: SearchSuggestion }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleSuggestionPress(item)}
      className="flex-row items-center p-4 border-b border-gray-50"
    >
      <View className="w-8 h-8 rounded-lg bg-gray-50 items-center justify-center mr-3">
        {item.type === 'town' && <MapPin size={16} color="#3b82f6" />}
        {item.type === 'category' && <Tags size={16} color="#10b981" />}
        {item.type === 'business' && <Briefcase size={16} color="#6366f1" />}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-bold text-gray-900 font-outfit">{item.name}</Text>
        {!!item.subtitle && (
          <Text className="text-[10px] text-gray-400 font-outfit uppercase tracking-wider">{item.subtitle}</Text>
        )}
      </View>
      <View className="bg-gray-50 px-2 py-1 rounded-md">
        <Text className="text-[8px] font-bold text-gray-400 font-outfit uppercase">
          {item.type}
        </Text>
      </View>
    </TouchableOpacity>
  ), [handleSearch]); // Depend on handleSearch as it's used indirectly via handleSuggestionPress

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Try to get full_name from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();

        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else {
          // Fallback to email prefix if profile name is not found
          const emailName = session.user.email?.split('@')[0];
          setUserName(emailName || 'User');
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchFeaturedBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_listings')
        .select('*, business:businesses(*)')
        .order('order_index', { ascending: true })
        .limit(6);

      if (error) throw error;
      // Flatten the data for easier use
      const flattened = data?.map(item => item.business).filter(Boolean) || [];
      setBusinesses(flattened);
    } catch (error: any) {
      console.error('Error fetching businesses:', error.message);
    } finally {
      setBizLoading(false);
    }
  };
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Top Header Section */}
        <View className="bg-white px-6 pt-4 pb-6 rounded-b-[40px] shadow-xl shadow-brand-dark/20 z-[70]">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-white/10 rounded-full mr-3 items-center justify-center overflow-hidden border border-white/20">
              <User size={24} color="#053765" />
            </View>
            <View>
              <Text className="text-brand-dark text-[12px] uppercase tracking-wider font-outfit">Welcome back,</Text>
              <Text className="text-xl text-brand-dark font-outfit">{userName}</Text>
            </View>
          </View>
          <View className="flex-row">
            <TouchableOpacity className="bg-blue-100 p-2.5 rounded-full border border-white/10 mr-2">
              <ScanLine size={18} color="#053765" />
            </TouchableOpacity>
            <TouchableOpacity className="bg-blue-100 p-2.5 rounded-full border border-white/10 mr-2">
              <Bell size={18} color="#053765" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Account')}
              className="bg-blue-100 p-2.5 rounded-full border border-white/10"
            >
              <Settings size={18} color="#053765" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="flex-1 z-0">
        {/* Search Bar Section */}
        <View className="px-6 py-4 z-50">
          <View className="relative">
            <TouchableOpacity 
              onPress={() => handleSearch()}
              className="absolute left-4 top-3.5 z-10"
            >
              <Search size={20} color="#94a3b8" />
            </TouchableOpacity>
            <TextInput
              placeholder={isSearchingLocation ? "Locating..." : "Nearby Search..."}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onSubmitEditing={() => handleSearch()}
              editable={!isSearchingLocation}
              className="bg-white text-gray-900 rounded-lg py-3.5 pl-11 pr-4 border border-gray-200 shadow-sm font-outfit text-lg"
            />
            
            {isSearchingLocation && (
              <View className="absolute right-4 top-4">
                <ActivityIndicator size="small" color="#053765" />
              </View>
            )}

            {!!(showSuggestions && suggestions.length > 0) && (
              <View 
                className="absolute top-[52px] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[60]"
                style={{ maxHeight: 350 }}
              >
                <FlatList
                  data={suggestions}
                  renderItem={renderSuggestion}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            )}
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          className="z-0"
          contentContainerStyle={{ paddingBottom: 100 }}
        >

        {/* Featured Card Section (News) */}
        <View className="px-6 py-4">
          <View className="bg-brand-dark rounded-[30px] p-6 flex-row items-center justify-between shadow-lg shadow-brand-dark/20 overflow-hidden relative">
            {/* Decorative background shape */}
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-brand-blue/10 rounded-full" />
            
            <View className="flex-1 pr-4 z-10">
              <View className="flex-row items-center mb-1">
                <Newspaper size={12} color="#dfb85d" />
                <Text className="text-brand-sand text-[10px] uppercase tracking-[0.2em] ml-2 font-outfit">News Update</Text>
              </View>
              <Text className="text-2xl text-white font-outfit leading-tight mb-3">SL Business Index</Text>
              <TouchableOpacity className="bg-brand-gold self-start px-6 py-2.5 rounded-2xl shadow-sm">
                <Text className="text-white text-[11px] uppercase font-outfit tracking-wider">Explore Features</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-white/10 p-5 rounded-[28px] border border-white/10 z-10">
              <BookOpenText size={42} color="#dfb85d" />
            </View>
          </View>
        </View>

        {/* Categories Section */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl text-gray-900 font-outfit">Browse by Category</Text>
            <TouchableOpacity>
              <Text className="text-brand-blue text-lg font-outfit">See all</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {CATEGORY_GROUPS.map((group) => (
              <TouchableOpacity 
                key={group.id} 
                onPress={() => setSelectedGroup(group)}
                className="bg-white rounded-[14px] p-3 mb-4 border border-gray-100 shadow-sm items-center justify-center" 
                style={{ width: '23%' }}
              >
                <View 
                  className="w-14 h-14 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: group.color + '10' }}
                >
                  <group.icon size={24} color={group.color} />
                </View>
                <Text className="text-[10px] text-gray-900 font-outfit text-center" numberOfLines={2}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Sheet Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedGroup}
          onRequestClose={() => setSelectedGroup(null)}
        >
          <Pressable 
            className="flex-1 bg-black/40 justify-end"
            onPress={() => setSelectedGroup(null)}
          >
            <View 
              className="bg-white rounded-t-[40px] px-6 pt-2 pb-10 shadow-2xl"
              style={{ maxHeight: '70%' }}
            >
              {/* Handle Bar */}
              <View className="items-center mb-6">
                <View className="w-12 h-1.5 bg-gray-200 rounded-full mt-2" />
              </View>

              {/* Modal Header */}
              <View className="flex-row justify-between items-center mb-6">
                <View className="flex-row items-center">
                  <View 
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: selectedGroup?.color + '15' }}
                  >
                    {selectedGroup?.icon && (
                      <selectedGroup.icon size={20} color={selectedGroup.color} />
                    )}
                  </View>
                  <Text className="text-xl font-bold text-gray-900 font-outfit">
                    {selectedGroup?.name}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setSelectedGroup(null)}
                  className="bg-gray-100 p-2 rounded-full"
                >
                  <ChevronRight size={20} color="#94a3b8" style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              </View>

              {/* Subcategories Grid */}
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap -mx-1">
                  {(selectedGroup ? dynamicSubcategories[selectedGroup.id] || [] : []).map((sub, index) => (
                    <View key={sub.id || index} className="w-1/3 p-1">
                      <TouchableOpacity 
                        onPress={() => {
                          setSelectedGroup(null);
                          handleSearch({ id: sub.id, name: sub.name, type: 'category', data: sub });
                        }}
                        className="bg-gray-50/50 p-3 h-24 rounded-2xl border border-gray-100 items-center justify-center"
                      >
                        <Text className="text-[10px] font-bold text-gray-700 font-outfit text-center" numberOfLines={3}>
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {!!selectedGroup && (dynamicSubcategories[selectedGroup.id]?.length === 0) && (
                    <View className="w-full py-10 items-center">
                      <Text className="text-gray-400 font-outfit">No subcategories found</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Featured Businesses Section */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl text-gray-900 font-outfit">Featured Businesses</Text>
            <TouchableOpacity>
              <Text className="text-brand-blue text-lg font-outfit">See all</Text>
            </TouchableOpacity>
          </View>

          {bizLoading ? (
            <ActivityIndicator color="#053765" />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {businesses.map((biz) => (
                <TouchableOpacity 
                  key={biz.id}
                  className="bg-white rounded-[10px] mb-4 border border-gray-100 shadow-sm overflow-hidden"
                  style={{ width: '48%' }}
                >
                  <Image 
                    source={{ uri: biz.image_url || biz.logo_url || 'https://via.placeholder.com/150' }} 
                    className="w-full h-32 bg-gray-100"
                    resizeMode="cover"
                  />
                  <View className="p-3">
                    <Text className="text-lg text-gray-900 font-outfit mb-1" numberOfLines={1}>
                      {biz.name}
                    </Text>
                    <View className="flex-row items-center mb-1">
                      <MapPin size={10} color="#2a7db4" />
                      <Text className="text-[10px] text-[#2a7db4] font-outfit ml-1" numberOfLines={1}>
                        {biz.city || (!!biz.address ? biz.address.split(',')[0] : 'Sri Lanka')}
                      </Text>
                    </View>
                    {!!biz.address && (
                      <Text className="text-[8px] text-gray-300 font-outfit mb-2" numberOfLines={1}>
                        {biz.address}
                      </Text>
                    )}
                    {!!biz.website && (
                      <View className="flex-row items-center">
                        <Globe size={10} color="#053765" />
                        <Text className="text-[9px] text-brand-blue font-outfit ml-1" numberOfLines={1}>
                          Visit Website
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
