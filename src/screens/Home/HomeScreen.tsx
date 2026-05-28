import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList, Keyboard, Modal, Pressable, Dimensions, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell, User, ScanLine, Package, Star, MapPin, ChevronRight, ArrowLeft, Globe, BookOpenText, Settings, Newspaper, Tags, Briefcase, Building2, X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { CATEGORY_GROUPS, CategoryGroup } from '../../data/categories';
import { groupCategoriesByMainGroups } from '../../utils/categoryMapping';
import Fuse from 'fuse.js';
import townsData from '../../data/sri-lanka-towns.json';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';

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
  const { theme, isDark } = useTheme();
  const colors = Colors[theme];
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [businessNews, setBusinessNews] = useState<any[]>([]);
  const [bizLoading, setBizLoading] = useState(true);
  const [catLoading, setCatLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup | null>(null);
  const [dynamicSubcategories, setDynamicSubcategories] = useState<Record<string, any[]>>({});
  const [userName, setUserName] = useState<string>('Guest');
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Pre-compute static search items (categories and towns)
  const staticSearchItems = useMemo(() => {
    const uniqueCategories = Array.from(new Set(CATEGORY_GROUPS.flatMap(g => [g.name, ...g.subcategories])));

    // Create a map to deduplicate towns by name and keep full data
    const townMap = new Map();
    (townsData as any[]).forEach((town: any) => {
      if (!townMap.has(town.name)) {
        townMap.set(town.name, town);
      }
    });

    return {
      categories: uniqueCategories.map((c, index) => ({
        id: `cat-${index}-${c}`,
        name: c,
        category_name: c,
        type: 'category' as const
      })),
      towns: Array.from(townMap.values()).map((town: any, index: number) => ({
        id: `town-${index}-${town.name}`,
        name: town.name,
        town_name: town.name,
        type: 'town' as const,
        subtitle: town.district !== 'Unknown' ? town.district : undefined,
        data: town // Include full town data with lat/lon
      }))
    };
  }, []);

  // Initialize Fuse for static items only (lightweight)
  const staticFuse = useMemo(() => {
    return new Fuse([...staticSearchItems.categories, ...staticSearchItems.towns], {
      keys: ['name', 'category_name', 'town_name'],
      threshold: 0.3,
      distance: 100,
      ignoreLocation: true,
    });
  }, [staticSearchItems]);

  useEffect(() => {
    fetchUserProfile();
    fetchFeaturedBusinesses();
    fetchCategories();
    fetchBusinessNews();
    fetchUnreadNotifications();
  }, []);

  // Auto-reset search when returning to home screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Clear search when user returns to home
      setSearchQuery('');
      setShowSuggestions(false);
      setSuggestions([]);
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (userId) {
      const cleanup = setupNotificationSubscription();
      return cleanup;
    }
  }, [userId]);

  // Smart search query parser - detects "location + category" combinations
  const parseSearchQuery = (query: string) => {
    if (!query || query.trim().length === 0) return null;

    const words = query.trim().toLowerCase().split(/\s+/);
    if (words.length < 2) return null;

    // Check each word combination for town + category
    for (let i = 0; i < words.length; i++) {
      const potentialTown = words.slice(0, i + 1).join(' ');
      const potentialCategory = words.slice(i + 1).join(' ');

      // Try to find matching town
      const town = staticSearchItems.towns.find(t =>
        t.name.toLowerCase() === potentialTown
      );

      if (town && potentialCategory) {
        // Try to find matching category
        const category = staticSearchItems.categories.find(c =>
          c.name.toLowerCase().includes(potentialCategory) ||
          potentialCategory.includes(c.name.toLowerCase())
        );

        if (category) {
          return {
            town: town,
            category: category.name,
            type: 'location_category' as const
          };
        }
      }
    }

    // Try reverse: category + town
    for (let i = 0; i < words.length; i++) {
      const potentialCategory = words.slice(0, i + 1).join(' ');
      const potentialTown = words.slice(i + 1).join(' ');

      const category = staticSearchItems.categories.find(c =>
        c.name.toLowerCase().includes(potentialCategory) ||
        potentialCategory.includes(c.name.toLowerCase())
      );

      if (category && potentialTown) {
        const town = staticSearchItems.towns.find(t =>
          t.name.toLowerCase() === potentialTown
        );

        if (town) {
          return {
            town: town,
            category: category.name,
            type: 'location_category' as const
          };
        }
      }
    }

    return null;
  };

  const handleSearch = async (suggestion?: SearchSuggestion) => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setIsSearchingLocation(true);

    let lat = COLOMBO_COORDS.latitude;
    let lng = COLOMBO_COORDS.longitude;
    let searchCategory = '';
    let searchTerm = suggestion?.name || searchQuery;

    // Smart parse: Check if query contains location + category
    if (!suggestion && searchQuery) {
      const parsed = parseSearchQuery(searchQuery);
      if (parsed) {
        // Found location + category combo!
        lat = parsed.town.data.lat;
        lng = parsed.town.data.lon;
        searchCategory = parsed.category;
        searchTerm = `${parsed.town.name} ${parsed.category}`;
        setIsSearchingLocation(false);

        // Navigate directly to map with both location and category
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('Map', {
            screen: 'MapMain',
            params: {
              q: searchTerm,
              lat,
              lng,
              type: 'location_category',
              category: searchCategory,
              suggestionData: { town: parsed.town.data, category: parsed.category }
            }
          });
        }
        setIsSearchingLocation(false);
        return;
      }
    }

    // If searching for a town, use town coordinates directly
    if (suggestion?.type === 'town' && suggestion?.data) {
      lat = suggestion.data.lat;
      lng = suggestion.data.lon;
      setIsSearchingLocation(false);
    } else if (!suggestion && searchQuery) {
      // Check if typed query is a town name (fast lookup)
      const typedTown = staticSearchItems.towns.find(t =>
        t.name.toLowerCase() === searchQuery.trim().toLowerCase()
      );

      if (typedTown && typedTown.data) {
        // Instant town match! Use town coordinates
        lat = typedTown.data.lat;
        lng = typedTown.data.lon;
        searchTerm = typedTown.name;
        setIsSearchingLocation(false);

        // Navigate immediately with town data
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('Map', {
            screen: 'MapMain',
            params: {
              q: typedTown.name,
              lat: lat.toString(),
              lng: lng.toString(),
              type: 'town',
              suggestionData: typedTown.data,
            }
          });
        }
        return;
      }

      // For other searches, try to get current location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
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
          } catch (locationError: any) {
            console.log('Could not get current location, using default coordinates:', locationError?.message || locationError);
          }
        } else {
          console.log('Location permission not granted, using default coordinates');
        }
      } catch (error: any) {
        console.log('Location services unavailable, using default coordinates:', error?.message || error);
      } finally {
        setIsSearchingLocation(false);
      }
    } else {
      setIsSearchingLocation(false);
    }

    // Navigate after location is determined
    InteractionManager.runAfterInteractions(() => {
      // Navigate to the Map tab (BusinessListScreen with map)
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('Map', {
          screen: 'MapMain',
          params: {
            q: suggestion?.name || searchQuery,
            lat,
            lng,
            type: suggestion?.type,
            suggestionData: suggestion?.data,
          }
        });
      }
    });
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (data) {
        setCategories(data);

        // Check if database has hierarchical structure (parent_id)
        const mainCategories = data.filter(c => !c.parent_id);
        const hasHierarchy = mainCategories.length > 0 &&
                           mainCategories.length < data.length;

        const subMapping: Record<string, any[]> = {};

        if (hasHierarchy) {
          // Use database hierarchy - match with CATEGORY_GROUPS by name
          CATEGORY_GROUPS.forEach(group => {
            // Try to find matching main category in database
            const dbMainCat = mainCategories.find(dbCat =>
              dbCat.name === group.name ||
              dbCat.name.toLowerCase() === group.name.toLowerCase()
            );

            if (dbMainCat) {
              // Get all subcategories for this main category
              subMapping[group.id] = data.filter(c => c.parent_id === dbMainCat.id);
            } else {
              // Fallback: use manual grouping
              subMapping[group.id] = [];
            }
          });
        } else {
          // No hierarchy in database - use manual grouping function
          const autoGrouped = groupCategoriesByMainGroups(data);

          // Map auto-grouped categories to CATEGORY_GROUPS
          CATEGORY_GROUPS.forEach(group => {
            subMapping[group.id] = autoGrouped[group.name] || [];
          });
        }

        setDynamicSubcategories(subMapping);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCatLoading(false);
    }
  };

  // Server-side fuzzy search with debouncing
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setSearchLoading(true);
        try {
          // Search static items (categories and towns) using Fuse
          const staticResults = staticFuse.search(searchQuery).slice(0, 5);

          // Search businesses using Supabase's ilike (PostgreSQL fuzzy search)
          const { data: businessResults } = await supabase
            .from('businesses')
            .select('id, name, city, address, logo_url')
            .eq('status', 'approved')
            .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
            .limit(10);

          const businessSuggestions: SearchSuggestion[] = (businessResults || []).map(b => ({
            id: `biz-${b.id}`,
            name: b.name,
            business_name: b.name,
            type: 'business' as const,
            subtitle: b.city || (b.address ? b.address.split(',')[0] : undefined),
            data: b
          }));

          // Combine results: businesses first, then static items
          const combinedResults = [
            ...businessSuggestions.slice(0, 7),
            ...staticResults.map((r: any) => r.item).slice(0, 5)
          ];

          setSuggestions(combinedResults);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimer);
  }, [searchQuery, staticFuse]);

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
        setUserId(session.user.id);
        // Try to get full_name from profiles table
        const { data: profile } = await supabase
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

  const fetchUnreadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  const setupNotificationSubscription = () => {
    if (!userId) return;

    const channel = supabase
      .channel('realtime_notifications_home')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const fetchBusinessNews = async () => {
    try {
      setNewsLoading(true);
      const { data, error } = await supabase
        .from('business_news')
        .select(`
          *,
          businesses!inner (
            name,
            logo_url,
            is_verified,
            status
          )
        `)
        .eq('businesses.status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setBusinessNews(data || []);
    } catch (error: any) {
      console.error('Error fetching business news:', error.message);
    } finally {
      setNewsLoading(false);
    }
  };
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}>
      {/* Top Header Section */}
      <View className="px-6 pt-4 pb-6 rounded-b-[40px] shadow-xl z-[70]" style={{ backgroundColor: colors.surface, shadowColor: colors.shadow.color, shadowOpacity: colors.shadow.opacity }}>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full mr-3 items-center justify-center overflow-hidden" style={{ backgroundColor: colors.brand.dark + '20', borderWidth: 1, borderColor: colors.border }}>
              <User size={24} color={colors.brand.dark} />
            </View>
            <View>
              <Text className="text-[12px] uppercase tracking-wider font-outfit" style={{ color: colors.text.secondary }}>Welcome back,</Text>
              <Text className="text-xl font-outfit" style={{ color: colors.text.primary }}>{userName}</Text>
            </View>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => navigation.navigate('QRScanner' as never)}
              className="p-2.5 rounded-full mr-2"
              style={{ backgroundColor: colors.brand.blue + '20', borderWidth: 1, borderColor: colors.border }}
            >
              <ScanLine size={18} color={colors.brand.blue} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications' as never)}
              className="p-2.5 rounded-full mr-2 relative"
              style={{ backgroundColor: colors.brand.blue + '20', borderWidth: 1, borderColor: colors.border }}
            >
              <Bell size={18} color={colors.brand.blue} />
              {unreadNotifications > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2" style={{ borderColor: colors.surface }}>
                  <Text className="text-white text-[9px] font-bold font-outfit">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Account')}
              className="p-2.5 rounded-full"
              style={{ backgroundColor: colors.brand.blue + '20', borderWidth: 1, borderColor: colors.border }}
            >
              <Settings size={18} color={colors.brand.dark} />
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
              disabled={isSearchingLocation}
              className="absolute left-4 top-3.5 z-10"
              activeOpacity={0.6}
            >
              <Search size={20} color={isSearchingLocation ? colors.text.tertiary : colors.brand.dark} />
            </TouchableOpacity>
            <TextInput
              placeholder={isSearchingLocation ? "Getting your location..." : "Search businesses near you..."}
              placeholderTextColor={colors.input.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
              editable={!isSearchingLocation}
              className="rounded-lg py-3.5 pl-11 pr-20 shadow-sm font-outfit text-lg"
              style={{ backgroundColor: colors.input.background, color: colors.input.text, borderWidth: 1, borderColor: colors.input.border }}
            />

            {isSearchingLocation ? (
              <View className="absolute right-4 top-4 flex-row items-center">
                <ActivityIndicator size="small" color="#053765" />
              </View>
            ) : searchQuery.length > 0 ? (
              <View className="absolute right-2 top-2 flex-row items-center gap-1">
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    setSuggestions([]);
                  }}
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: colors.surface }}
                  activeOpacity={0.7}
                >
                  <X size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSearch()}
                  className="bg-brand-blue px-3 py-2 rounded-lg"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-xs font-bold font-outfit">Go</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handleSearch()}
                className="absolute right-4 top-3.5 bg-brand-blue px-4 py-1.5 rounded-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white text-xs font-bold font-outfit">Near Me</Text>
              </TouchableOpacity>
            )}

            {(showSuggestions || searchLoading) && (
              <View
                className="absolute top-[52px] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[60]"
                style={{ maxHeight: 350 }}
              >
                {searchLoading ? (
                  <View className="p-4 items-center justify-center">
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text className="text-xs text-gray-400 mt-2 font-outfit">Searching...</Text>
                  </View>
                ) : suggestions.length > 0 ? (
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
                ) : (
                  <View className="p-4 items-center justify-center">
                    <Text className="text-sm text-gray-400 font-outfit">No results found</Text>
                  </View>
                )}
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
          <View className="rounded-[30px] p-6 flex-row items-center justify-between shadow-lg overflow-hidden relative" style={{ backgroundColor: colors.brand.dark }}>
            {/* Decorative background shape */}
            <View className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ backgroundColor: colors.brand.blue + '10' }} />

            <View className="flex-1 pr-4 z-10">
              <View className="flex-row items-center mb-1">
                <Newspaper size={12} color={colors.brand.gold} />
                <Text className="text-[10px] uppercase tracking-[0.2em] ml-2 font-outfit" style={{ color: colors.brand.gold }}>News Update</Text>
              </View>
              <Text className="text-2xl font-outfit leading-tight mb-3" style={{ color: colors.text.inverse }}>SL Business Index</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('BusinessNews' as never)}
                className="self-start px-6 py-2.5 rounded-2xl shadow-sm"
                style={{ backgroundColor: colors.brand.gold }}
              >
                <Text className="text-[11px] uppercase font-outfit tracking-wider" style={{ color: colors.text.inverse }}>Explore Features</Text>
              </TouchableOpacity>
            </View>
            <View className="p-5 rounded-[28px] border z-10" style={{ backgroundColor: colors.text.inverse + '10', borderColor: colors.text.inverse + '10' }}>
              <BookOpenText size={42} color={colors.brand.gold} />
            </View>
          </View>
        </View>

        {/* Categories Section */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-outfit" style={{ color: colors.text.primary }}>Browse by Category</Text>
            <TouchableOpacity>
              <Text className="text-lg font-outfit" style={{ color: colors.brand.blue }}>See all</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {CATEGORY_GROUPS.map((group) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => setSelectedGroup(group)}
                className="rounded-[14px] p-3 mb-4 border shadow-sm items-center justify-center"
                style={{ width: '23%', backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: group.color + '10' }}
                >
                  <group.icon size={24} color={group.color} />
                </View>
                <Text className="text-[10px] font-outfit text-center" numberOfLines={2} style={{ color: colors.text.primary }}>
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
            className="flex-1 justify-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onPress={() => setSelectedGroup(null)}
          >
            <View
              className="rounded-t-[40px] px-6 pt-2 pb-10 shadow-2xl"
              style={{ maxHeight: '70%', backgroundColor: colors.surface }}
            >
              {/* Handle Bar */}
              <View className="items-center mb-6">
                <View className="w-12 h-1.5 rounded-full mt-2" style={{ backgroundColor: colors.border }} />
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
                  <Text className="text-xl font-bold font-outfit" style={{ color: colors.text.primary }}>
                    {selectedGroup?.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedGroup(null)}
                  className="p-2 rounded-full"
                  style={{ backgroundColor: colors.input.background }}
                >
                  <ChevronRight size={20} color={colors.text.tertiary} style={{ transform: [{ rotate: '90deg' }] }} />
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
                        className="p-3 h-24 rounded-2xl border items-center justify-center"
                        style={{ backgroundColor: colors.background, borderColor: colors.border }}
                      >
                        <Text className="text-[10px] font-bold font-outfit text-center" numberOfLines={3} style={{ color: colors.text.secondary }}>
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {!!selectedGroup && (dynamicSubcategories[selectedGroup.id]?.length === 0) && (
                    <View className="w-full py-10 items-center">
                      <Text className="font-outfit" style={{ color: colors.text.tertiary }}>No subcategories found</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Business News Section */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-outfit" style={{ color: colors.text.primary }}>Latest Business News</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BusinessNews' as never)}>
              <Text className="text-lg font-outfit" style={{ color: colors.brand.blue }}>See all</Text>
            </TouchableOpacity>
          </View>

          {newsLoading ? (
            <ActivityIndicator color={colors.brand.dark} />
          ) : businessNews.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2">
              {businessNews.map((news) => (
                <TouchableOpacity
                  key={news.id}
                  onPress={() => navigation.navigate('BusinessNews' as never)}
                  className="rounded-[14px] mr-3 border shadow-sm overflow-hidden"
                  style={{ width: 280, backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  {news.images && news.images.length > 0 && (
                    <Image
                      source={{ uri: news.images[0] }}
                      className="w-full h-36"
                      style={{ backgroundColor: colors.input.background }}
                      resizeMode="cover"
                    />
                  )}
                  <View className="p-3">
                    <View className="flex-row items-center mb-2">
                      <View className="w-6 h-6 rounded items-center justify-center mr-2" style={{ backgroundColor: colors.input.background }}>
                        {news.businesses?.logo_url ? (
                          <Image
                            source={{ uri: news.businesses.logo_url }}
                            className="w-full h-full rounded"
                            resizeMode="cover"
                          />
                        ) : (
                          <Building2 size={12} color={colors.text.tertiary} />
                        )}
                      </View>
                      <Text className="text-[10px] font-outfit flex-1" numberOfLines={1} style={{ color: colors.text.secondary }}>
                        {news.businesses?.name}
                      </Text>
                      <View className="px-2 py-0.5 rounded" style={{ backgroundColor: news.post_type === 'hiring' ? colors.info + '20' : colors.success + '20' }}>
                        <Text className="text-[8px] font-bold uppercase font-outfit" style={{ color: news.post_type === 'hiring' ? colors.info : colors.success }}>
                          {news.post_type === 'hiring' ? 'Hiring' : 'Looking'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-sm font-outfit mb-1" numberOfLines={2} style={{ color: colors.text.primary }}>
                      {news.title}
                    </Text>
                    <Text className="text-[10px] font-outfit" numberOfLines={2} style={{ color: colors.text.secondary }}>
                      {news.content}
                    </Text>
                    <View className="flex-row items-center mt-2 pt-2 border-t" style={{ borderTopColor: colors.border }}>
                      <MapPin size={10} color={colors.brand.gold} />
                      <Text className="text-[9px] font-outfit ml-1" style={{ color: colors.text.tertiary }}>
                        {news.district}
                      </Text>
                      <Text className="mx-1" style={{ color: colors.text.tertiary }}>•</Text>
                      <Text className="text-[9px] font-outfit" style={{ color: colors.text.tertiary }}>
                        {news.category}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Featured Businesses Section */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-outfit" style={{ color: colors.text.primary }}>Featured Businesses</Text>
            <TouchableOpacity>
              <Text className="text-lg font-outfit" style={{ color: colors.brand.blue }}>See all</Text>
            </TouchableOpacity>
          </View>

          {bizLoading ? (
            <ActivityIndicator color={colors.brand.dark} />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {businesses.map((biz) => (
                <TouchableOpacity
                  key={biz.id}
                  onPress={() => {
                    const params: any = { businessId: biz.id };
                    if (biz.slug) {
                      params.businessSlug = biz.slug;
                    }
                    navigation.navigate('BusinessDetails' as never, params as never);
                  }}
                  className="rounded-[10px] mb-4 border shadow-sm overflow-hidden"
                  style={{ width: '48%', backgroundColor: colors.surface, borderColor: colors.border }}
                >
                  <Image
                    source={{ uri: biz.image_url || biz.logo_url || 'https://via.placeholder.com/150' }}
                    className="w-full h-32"
                    style={{ backgroundColor: colors.input.background }}
                    resizeMode="cover"
                  />
                  <View className="p-3">
                    <Text className="text-lg font-outfit mb-1" numberOfLines={1} style={{ color: colors.text.primary }}>
                      {biz.name}
                    </Text>
                    <View className="flex-row items-center mb-1">
                      <MapPin size={10} color={colors.brand.blue} />
                      <Text className="text-[10px] font-outfit ml-1" numberOfLines={1} style={{ color: colors.brand.blue }}>
                        {biz.city || (!!biz.address ? biz.address.split(',')[0] : 'Sri Lanka')}
                      </Text>
                    </View>
                    {!!(biz.detailed_address || biz.address) && (
                      <Text className="text-[8px] font-outfit mb-2" numberOfLines={2} style={{ color: colors.text.tertiary }}>
                        {biz.detailed_address || biz.address}
                      </Text>
                    )}
                    {!!biz.website_url && (
                      <View className="flex-row items-center">
                        <Globe size={10} color={colors.brand.dark} />
                        <Text className="text-[9px] font-outfit ml-1" numberOfLines={1} style={{ color: colors.brand.blue }}>
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
