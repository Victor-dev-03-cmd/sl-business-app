import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, MapPin, Star, ChevronRight, X, ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { CATEGORY_GROUPS } from '../../data/categories';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';

interface Business {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  address: string;
  city: string;
  logo_url: string;
  image_url: string;
  rating: number;
  is_verified: boolean;
}

export const AllBusinessesScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const navigation = useNavigation<any>();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, slug, name, category, description, address, city, logo_url, image_url, rating, is_verified')
        .eq('status', 'approved')
        .order('name', { ascending: true });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err: any) {
      console.error('AllBusinessesScreen fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = businesses.filter(b => {
    const q = search.toLowerCase();
    const matchesSearch =
      q === '' ||
      b.name?.toLowerCase().includes(q) ||
      b.category?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.address?.toLowerCase().includes(q);
    const matchesCategory = activeCategory === '' || b.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingTop: 6,
        paddingBottom: 12,
      }}>
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              marginRight: 12, padding: 8, borderRadius: 12,
              backgroundColor: colors.input.background,
            }}
          >
            <ArrowLeft size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
              All Businesses
            </Text>
            <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.tertiary, marginTop: 1 }}>
              {loading ? 'Loading…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          marginHorizontal: 16, marginBottom: 12,
          paddingHorizontal: 14, paddingVertical: 10,
          borderRadius: 14, borderWidth: 1,
          backgroundColor: colors.input.background,
          borderColor: colors.border,
        }}>
          <Search size={17} color={colors.text.tertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Name, category, city…"
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
            style={{
              flex: 1, marginLeft: 10,
              fontFamily: 'Outfit', fontSize: 15,
              color: colors.text.primary,
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {(['', ...CATEGORY_GROUPS.map(g => g.name)] as string[]).map(cat => {
            const active = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat || '__all__'}
                onPress={() => setActiveCategory(cat)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7,
                  borderRadius: 20, borderWidth: 1,
                  backgroundColor: active ? colors.brand.blue : colors.surface,
                  borderColor: active ? colors.brand.blue : colors.border,
                }}
              >
                <Text style={{
                  fontFamily: 'Outfit', fontSize: 12, fontWeight: '700',
                  color: active ? '#ffffff' : colors.text.secondary,
                }}>
                  {cat === '' ? 'All' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ───────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetch(); }}
            tintColor={colors.brand.blue}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              const params: any = { businessId: item.id };
              if (item.slug) params.businessSlug = item.slug;
              navigation.navigate('BusinessDetails', params);
            }}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center',
              marginHorizontal: 16, marginBottom: 10,
              padding: 14, borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            {/* Thumbnail */}
            <Image
              source={{ uri: item.image_url || item.logo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' }}
              style={{
                width: 64, height: 64, borderRadius: 14,
                backgroundColor: colors.input.background,
              }}
              resizeMode="cover"
            />

            {/* Info */}
            <View style={{ flex: 1, marginLeft: 14 }}>
              {/* Category + verified */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <Text
                  style={{
                    fontFamily: 'Outfit', fontSize: 10, fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: 0.8,
                    color: colors.brand.blue, flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.category || 'General'}
                </Text>
                {item.is_verified && (
                  <ShieldCheck size={12} color="#10b981" style={{ marginLeft: 5 }} />
                )}
              </View>

              {/* Name */}
              <Text
                style={{
                  fontFamily: 'Outfit', fontSize: 15, fontWeight: '700',
                  color: colors.text.primary, marginBottom: 4,
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {/* Location + rating */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <MapPin size={11} color={colors.text.tertiary} />
                <Text
                  style={{ fontFamily: 'Outfit', fontSize: 11, color: colors.text.tertiary, marginLeft: 3, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {item.city || item.address?.split(',')[0] || 'Sri Lanka'}
                </Text>
                {item.rating > 0 && (
                  <>
                    <Text style={{ color: colors.border, marginHorizontal: 6, fontSize: 11 }}>·</Text>
                    <Star size={11} color={colors.brand.gold} fill={colors.brand.gold} />
                    <Text style={{ fontFamily: 'Outfit', fontSize: 11, color: colors.brand.gold, marginLeft: 3 }}>
                      {item.rating.toFixed(1)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            <ChevronRight size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 72 }}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.brand.blue} />
            ) : (
              <>
                <Text style={{ fontFamily: 'Outfit', fontSize: 16, color: colors.text.secondary, marginBottom: 6 }}>
                  No businesses found
                </Text>
                {(search.length > 0 || activeCategory !== '') && (
                  <TouchableOpacity
                    onPress={() => { setSearch(''); setActiveCategory(''); }}
                    style={{
                      marginTop: 12, paddingHorizontal: 20, paddingVertical: 10,
                      borderRadius: 10, backgroundColor: colors.brand.blue + '20',
                    }}
                  >
                    <Text style={{ fontFamily: 'Outfit', fontSize: 13, color: colors.brand.blue }}>
                      Clear filters
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};
