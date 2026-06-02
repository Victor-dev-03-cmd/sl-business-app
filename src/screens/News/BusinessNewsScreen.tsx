import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  TrendingUp,
  Newspaper,
  Eye,
  ChevronRight,
  Building2,
  Phone,
  MessageSquare,
  MapPin,
  Briefcase,
  ShieldCheck,
  Plus
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';
import { formatPhoneWithCountryCode, formatPhoneForWhatsApp } from '../../utils/phoneHelpers';
import { AddNewsModal } from '../../components/AddNewsModal';
import { NewsDetailModal } from '../../components/NewsDetailModal';
import { EditNewsModal } from '../../components/EditNewsModal';
import type { NewsPost as NewsPostType } from '../../components/NewsDetailModal';

// Use the shared type from NewsDetailModal (re-exported for this screen)
type NewsPost = NewsPostType;

export const BusinessNewsScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const navigation = useNavigation();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasVerifiedBusiness, setHasVerifiedBusiness] = useState(false);
  const [hasAnyBusiness, setHasAnyBusiness] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const MAIN_CATEGORY_GROUPS = [
    "Manpower Services",
    "Care & Lifestyle",
    "Professional & Finance",
    "Construction & Industrial",
    "Technical & Electronics",
    "Events, Food & Leisure",
    "Travel & Transport",
    "Retail & Others",
  ];

  const SRI_LANKAN_DISTRICTS = [
    "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
    "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
    "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
    "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
  ];

  useEffect(() => {
    fetchNews();
    checkVerifiedBusiness();
  }, [selectedCategory, selectedDistrict, filterType]);

  const checkVerifiedBusiness = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasVerifiedBusiness(false);
        setHasAnyBusiness(false);
        setCurrentUserId(null);
        return;
      }
      setCurrentUserId(user.id);

      // Single query — fetch is_verified so we can derive both states at once
      const { data, error } = await supabase
        .from('businesses')
        .select('id, is_verified')
        .eq('owner_id', user.id)
        .eq('status', 'approved');

      if (error) throw error;

      const businesses = data ?? [];
      setHasAnyBusiness(businesses.length > 0);
      setHasVerifiedBusiness(businesses.some(b => b.is_verified === true));
    } catch (error) {
      console.error('Error checking verified business:', error);
      setHasVerifiedBusiness(false);
      setHasAnyBusiness(false);
    }
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      let query = supabase
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
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      if (selectedDistrict !== 'all') {
        query = query.eq('district', selectedDistrict);
      }
      if (filterType !== 'all') {
        query = query.eq('post_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error fetching news:', error.message);
      Alert.alert('Error', 'Failed to load business news');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  const handlePostPress = (post: NewsPost) => {
    setSelectedPost(post);
    setShowDetailModal(true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const renderFeaturedPost = (post: NewsPost) => (
    <TouchableOpacity
      key={post.id}
      onPress={() => handlePostPress(post)}
      style={{ marginBottom: 24 }}
      activeOpacity={0.9}
    >
      <View style={{ backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>
        {post.images && post.images.length > 0 && (
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: post.images[0] }}
              style={{ width: '100%', height: 224, backgroundColor: colors.input.background }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 128 }}
            />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 }}>
              <View className="flex-row items-center mb-2">
                <View className={`px-3 py-1 rounded-full ${post.post_type === 'hiring' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                  <Text className="text-white text-[10px] font-bold uppercase font-outfit tracking-wider">
                    {post.post_type === 'hiring' ? 'Hiring' : 'Looking'}
                  </Text>
                </View>
                <View className="flex-row items-center ml-3 bg-black/30 px-2 py-1 rounded-full">
                  <MapPin size={10} color="white" />
                  <Text className="text-white text-[10px] ml-1 font-outfit">
                    {post.district}
                  </Text>
                </View>
                {post.images.length > 1 && (
                  <View className="bg-black/30 px-2 py-1 rounded-full ml-2">
                    <Text className="text-white text-[10px] font-outfit">
                      +{post.images.length - 1} Photos
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', fontFamily: 'Outfit', lineHeight: 24 }} numberOfLines={2}>
                {post.title}
              </Text>
            </View>
          </View>
        )}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.input.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              {post.businesses?.logo_url ? (
                <Image
                  source={{ uri: post.businesses.logo_url }}
                  style={{ width: '100%', height: '100%', borderRadius: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <Building2 size={20} color={colors.text.tertiary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: 'bold', fontFamily: 'Outfit' }}>
                  {post.businesses?.name}
                </Text>
                {post.businesses?.is_verified && (
                  <ShieldCheck size={14} color="#3b82f6" style={{ marginLeft: 4 }} />
                )}
              </View>
              <Text style={{ color: colors.text.tertiary, fontSize: 10, fontFamily: 'Outfit', textTransform: 'uppercase' }}>
                {post.category}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.text.secondary, fontSize: 14, fontFamily: 'Outfit', marginBottom: 12 }} numberOfLines={3}>
            {post.content}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={12} color={colors.text.tertiary} />
              <Text style={{ color: colors.text.tertiary, fontSize: 12, marginLeft: 4, fontFamily: 'Outfit' }}>
                {formatTime(post.created_at)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => {
                  const formattedPhone = formatPhoneWithCountryCode(post.contact_phone);
                  Linking.openURL(`tel:${formattedPhone}`);
                }}
                style={{ backgroundColor: colors.brand.blue + '1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
              >
                <Phone size={12} color={colors.brand.blue} />
                <Text style={{ color: colors.brand.blue, fontSize: 10, fontWeight: 'bold', marginLeft: 4, fontFamily: 'Outfit' }}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPostItem = (post: NewsPost) => (
    <TouchableOpacity
      key={post.id}
      onPress={() => handlePostPress(post)}
      style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, borderWidth: 1, borderColor: colors.border }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: colors.input.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          {post.businesses?.logo_url ? (
            <Image
              source={{ uri: post.businesses.logo_url }}
              style={{ width: '100%', height: '100%', borderRadius: 8 }}
              resizeMode="cover"
            />
          ) : (
            <Building2 size={20} color={colors.text.tertiary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: 'bold', fontFamily: 'Outfit' }}>
              {post.businesses?.name}
            </Text>
            {post.businesses?.is_verified && (
              <ShieldCheck size={12} color="#3b82f6" style={{ marginLeft: 4 }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8, backgroundColor: post.post_type === 'hiring' ? '#eff6ff' : '#ecfdf5' }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'Outfit', color: post.post_type === 'hiring' ? '#3b82f6' : '#10b981' }}>
                {post.post_type === 'hiring' ? 'Hiring' : 'Looking'}
              </Text>
            </View>
            <MapPin size={10} color={colors.brand.gold} />
            <Text style={{ color: colors.text.secondary, fontSize: 9, marginLeft: 4, fontFamily: 'Outfit' }}>
              {post.district}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.text.tertiary, fontSize: 9, fontFamily: 'Outfit' }}>
          {formatTime(post.created_at)}
        </Text>
      </View>

      {post.images && post.images.length > 0 && (
        <Image
          source={{ uri: post.images[0] }}
          style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: colors.input.background, marginBottom: 12 }}
          resizeMode="cover"
        />
      )}

      <Text style={{ color: colors.text.primary, fontSize: 16, fontWeight: 'bold', fontFamily: 'Outfit', marginBottom: 8 }} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={{ color: colors.text.secondary, fontSize: 14, fontFamily: 'Outfit', marginBottom: 12 }} numberOfLines={2}>
        {post.content}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ backgroundColor: colors.input.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ color: colors.text.secondary, fontSize: 9, fontFamily: 'Outfit' }}>
            {post.category}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              const formattedPhone = formatPhoneWithCountryCode(post.contact_phone);
              Linking.openURL(`tel:${formattedPhone}`);
            }}
            style={{ backgroundColor: colors.brand.blue + '1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginRight: 8 }}
          >
            <Phone size={12} color={colors.brand.blue} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              const formattedPhone = formatPhoneForWhatsApp(post.contact_phone);
              Linking.openURL(`https://wa.me/${formattedPhone}`);
            }}
            style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
          >
            <MessageSquare size={12} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 8, backgroundColor: colors.input.background, borderRadius: 999 }}
          >
            <ArrowLeft size={20} color={colors.brand.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Outfit' }}>
              Business News
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Outfit' }}>
              Latest updates from Sri Lanka
            </Text>
          </View>
          <View style={{ backgroundColor: colors.brand.blue, padding: 8, borderRadius: 999 }}>
            <Newspaper size={20} color="white" />
          </View>
        </View>

        {/* Category & Type Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexDirection: 'row', marginHorizontal: -4, marginBottom: 8 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory('all')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              marginHorizontal: 4,
              borderWidth: 1,
              backgroundColor: selectedCategory === 'all' ? colors.brand.blue : colors.surface,
              borderColor: selectedCategory === 'all' ? colors.brand.blue : colors.border
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'Outfit',
                color: selectedCategory === 'all' ? 'white' : colors.text.secondary
              }}
            >
              All Categories
            </Text>
          </TouchableOpacity>
          {MAIN_CATEGORY_GROUPS.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                marginHorizontal: 4,
                borderWidth: 1,
                backgroundColor: selectedCategory === cat ? colors.brand.blue : colors.surface,
                borderColor: selectedCategory === cat ? colors.brand.blue : colors.border
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  fontFamily: 'Outfit',
                  color: selectedCategory === cat ? 'white' : colors.text.secondary
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Type Filters */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setFilterType('all')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              backgroundColor: filterType === 'all' ? '#374151' : colors.surface,
              borderColor: filterType === 'all' ? '#374151' : colors.border
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'Outfit',
                color: filterType === 'all' ? 'white' : colors.text.secondary
              }}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterType('hiring')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              backgroundColor: filterType === 'hiring' ? '#3b82f6' : colors.surface,
              borderColor: filterType === 'hiring' ? '#3b82f6' : colors.border
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'Outfit',
                color: filterType === 'hiring' ? 'white' : colors.text.secondary
              }}
            >
              Hiring
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterType('looking')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              backgroundColor: filterType === 'looking' ? '#10b981' : colors.surface,
              borderColor: filterType === 'looking' ? '#10b981' : colors.border
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'Outfit',
                color: filterType === 'looking' ? 'white' : colors.text.secondary
              }}
            >
              Looking
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.brand.dark]}
            tintColor={colors.brand.dark}
          />
        }
      >
        {loading && posts.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
            <ActivityIndicator size="large" color={colors.brand.dark} />
            <Text style={{ color: colors.text.secondary, marginTop: 16, fontFamily: 'Outfit' }}>Loading business news...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
            <Briefcase size={48} color={colors.text.tertiary} />
            <Text style={{ color: colors.text.secondary, marginTop: 16, fontFamily: 'Outfit', textAlign: 'center' }}>
              No business updates found
            </Text>
            <Text style={{ color: colors.text.tertiary, fontSize: 12, marginTop: 8, fontFamily: 'Outfit', textAlign: 'center' }}>
              Try adjusting your filters
            </Text>
          </View>
        ) : (
          <>
            {/* Featured Post */}
            {posts.length > 0 && renderFeaturedPost(posts[0])}

            {/* Stats Section */}
            <View style={{ flexDirection: 'row', marginBottom: 24 }}>
              <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginRight: 8, borderWidth: 1, borderColor: colors.border }}>
                <Briefcase size={20} color={colors.brand.blue} />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Outfit', marginTop: 8 }}>
                  {posts.length}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Outfit' }}>
                  Total Posts
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginLeft: 8, borderWidth: 1, borderColor: colors.border }}>
                <Clock size={20} color={colors.brand.gold} />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Outfit', marginTop: 8 }}>
                  {posts.filter(p => {
                    const date = new Date(p.created_at);
                    const now = new Date();
                    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
                    return diffHours < 24;
                  }).length}
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Outfit' }}>
                  Today's Updates
                </Text>
              </View>
            </View>

            {/* Recent Posts */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Outfit', marginBottom: 12 }}>
                Recent Updates
              </Text>
              {posts.slice(1).map(renderPostItem)}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Add News Button — visible to all vendors, verified or not */}
      {hasAnyBusiness && (
        <TouchableOpacity
          onPress={() => {
            if (hasVerifiedBusiness) {
              setShowAddModal(true);
            } else {
              Alert.alert(
                'Verification Required',
                'Only verified businesses can post news updates. Would you like to get your business verified now?',
                [
                  { text: 'Not Now', style: 'cancel' },
                  {
                    text: 'Get Verified',
                    onPress: () => (navigation as any).navigate('Account', {
                      screen: 'VendorVerification',
                    }),
                  },
                ]
              );
            }
          }}
          className="absolute bottom-6 right-6 w-16 h-16 rounded-full items-center justify-center"
          style={{
            backgroundColor: hasVerifiedBusiness ? colors.brand.blue : colors.brand.gold,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Plus size={28} color="#ffffff" strokeWidth={3} />
        </TouchableOpacity>
      )}

      {/* Add News Modal */}
      <AddNewsModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchNews();
          checkVerifiedBusiness();
        }}
      />

      {/* Full-view detail popup */}
      <NewsDetailModal
        post={selectedPost}
        currentUserId={currentUserId}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={(post) => {
          setEditingPost(post);
          setShowEditModal(true);
        }}
        onDeleted={() => {
          fetchNews();
          setSelectedPost(null);
        }}
      />

      {/* Edit post modal */}
      <EditNewsModal
        post={editingPost}
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={() => {
          fetchNews();
          setShowEditModal(false);
        }}
      />
    </SafeAreaView>
  );
};
