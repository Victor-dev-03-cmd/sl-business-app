import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  Share,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Globe,
  Clock,
  Star,
  Share2,
  Flag,
  Navigation,
  Heart,
  ExternalLink,
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';
import { ReportModal } from '../../components/ReportModal';
import { formatPhoneWithCountryCode, formatPhoneForWhatsApp } from '../../utils/phoneHelpers';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.35;

interface BusinessData {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  phone: string;
  email: string;
  website_url: string;
  website_name: string;
  address: string;
  detailed_address: string;
  city: string;
  latitude: number;
  longitude: number;
  image_url: string;
  logo_url: string;
  rating: number;
  reviews_count: number;
  working_hours: any;
  facilities: string[];
  distance_meters?: number;
  whatsapp_number?: string;
  created_at: string;
  status: string;
  is_verified: boolean;
  can_show_badge: boolean;
  owner_id: string;
  owner_name: string;
  registration_number: string;
  is_registered: boolean;
}

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  sentiment: string | null;
  created_at: string;
  review_replies?: {
    reply_text: string;
    created_at: string;
  }[];
}

export const BusinessDetailsScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const navigation = useNavigation();
  const route = useRoute<any>();
  const businessId = route.params?.businessId;
  const businessSlug = route.params?.businessSlug;

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    user_name: ''
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (businessId || businessSlug) {
      fetchBusinessDetails();
      checkIfFavorite();
      recordView();
    }
    getCurrentUser();
  }, [businessId, businessSlug]);

  useEffect(() => {
    if (business?.id) {
      fetchReviews();
    }
  }, [business?.id]);

  const getCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const fetchBusinessDetails = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('businesses')
        .select('*');

      // Try slug first, then fallback to ID
      if (businessSlug) {
        query = query.eq('slug', businessSlug);
      } else if (businessId) {
        query = query.eq('id', businessId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setBusiness(data);
    } catch (error: any) {
      console.error('Error fetching business details:', error.message);
      Alert.alert('Error', 'Failed to load business details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          review_replies (
            reply_text,
            created_at
          )
        `)
        .eq('business_id', business?.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const recordView = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Record view in business_views table
      if (session?.user && (businessId || businessSlug)) {
        await supabase.from('business_views').insert({
          business_id: businessId,
          user_id: session.user.id
        });
      }

      // Increment view count
      if (businessId) {
        await supabase.rpc('increment_business_views', {
          business_id: businessId
        });
      }
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('business_id', businessId)
        .maybeSingle();

      if (data) {
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const handleEnquirySubmit = async () => {
    if (!enquiryForm.name || !enquiryForm.phone || !enquiryForm.message) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmittingEnquiry(true);

      // Save lead to database
      const { error } = await supabase.from('leads').insert({
        business_id: business?.id,
        name: enquiryForm.name,
        email: enquiryForm.email,
        phone: enquiryForm.phone,
        message: enquiryForm.message,
        source: 'Mobile App - Business Details'
      });

      if (error) throw error;

      // Open WhatsApp with message
      if (business?.phone) {
        const formattedPhone = formatPhoneForWhatsApp(business.phone);

        const whatsappText = `New Enquiry from SLBI:\n\nName: ${enquiryForm.name}\nPhone: ${enquiryForm.phone}\nMessage: ${enquiryForm.message}`;
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappText)}`;

        await Linking.openURL(whatsappUrl);
      }

      setEnquiryForm({ name: '', email: '', phone: '', message: '' });
      setShowEnquiryModal(false);
      Alert.alert('Success', 'Message sent! Opening WhatsApp...');
    } catch (error: any) {
      console.error('Error submitting enquiry:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewForm.user_name || !reviewForm.comment) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setSubmittingReview(true);
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          business_id: business?.id,
          user_id: session?.user?.id || null,
          user_name: reviewForm.user_name,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          is_approved: true // Auto-approve for now
        })
        .select()
        .single();

      if (error) throw error;

      setReviews([{ ...data, review_replies: [] }, ...reviews]);
      setReviewForm({ rating: 5, comment: '', user_name: '' });
      setShowReviewModal(false);
      Alert.alert('Success', 'Review posted successfully!');
    } catch (error: any) {
      console.error('Error posting review:', error);
      Alert.alert('Error', 'Failed to post review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Sign In Required', 'Please sign in to save favorites');
        return;
      }

      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('business_id', business?.id);
        setIsFavorite(false);
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: session.user.id,
            business_id: business?.id
          });
        setIsFavorite(true);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error.message);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handleCall = () => {
    if (!business?.phone) {
      Alert.alert('No Phone', 'Phone number not available');
      return;
    }

    Alert.alert(
      'Call Business',
      `Do you want to call ${business.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const phoneNumber = formatPhoneWithCountryCode(business.phone);
            Linking.openURL(`tel:${phoneNumber}`);
          }
        }
      ]
    );
  };

  const handleWhatsApp = () => {
    if (!business?.whatsapp_number && !business?.phone) {
      Alert.alert('No WhatsApp', 'WhatsApp number not available');
      return;
    }

    const whatsappNumber = formatPhoneForWhatsApp(business.whatsapp_number || business.phone);
    const message = `Hi, I found your business "${business.name}" on SL Business Index app.`;
    const url = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp to use this feature');
        }
      })
      .catch((err) => console.error('Error opening WhatsApp:', err));
  };

  const handleEmail = () => {
    if (!business?.email) {
      Alert.alert('No Email', 'Email address not available');
      return;
    }

    const subject = `Inquiry about ${business.name}`;
    const body = `Hi,\n\nI found your business on SL Business Index app and would like to know more.\n\nBest regards`;
    Linking.openURL(`mailto:${business.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleWebsite = () => {
    if (!business?.website_url) {
      Alert.alert('No Website', 'Website not available');
      return;
    }

    let url = business.website_url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Cannot open website');
        }
      })
      .catch((err) => console.error('Error opening website:', err));
  };

  const handleDirections = () => {
    if (!business?.latitude || !business?.longitude) {
      Alert.alert('No Location', 'Location not available');
      return;
    }

    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q='
    });
    const latLng = `${business.latitude},${business.longitude}`;
    const label = business.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    if (!business) return;

    try {
      await Share.share({
        message: `Check out ${business.name} on SL Business Index!\n\n${business.description || ''}\n\nAddress: ${business.detailed_address || business.address || ''}\nPhone: ${business.phone || ''}`,
        title: business.name
      });
    } catch (error: any) {
      console.error('Error sharing:', error.message);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand.dark} />
          <Text style={{ color: colors.text.secondary, marginTop: 16, fontFamily: 'Outfit' }}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <AlertCircle size={48} color={colors.text.tertiary} />
          <Text style={{ color: colors.text.secondary, marginTop: 16, fontFamily: 'Outfit', textAlign: 'center' }}>Business not found</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: 24, backgroundColor: colors.brand.blue, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Outfit' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Header Image */}
        <View style={{ height: IMAGE_HEIGHT }} className="relative">
          <Image
            source={{ uri: business.image_url || business.logo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' }}
            style={{ width, height: IMAGE_HEIGHT }}
            className="bg-gray-200"
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
          />

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ position: 'absolute', top: 16, left: 16, backgroundColor: colors.surface, padding: 10, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
          >
            <ArrowLeft size={24} color={colors.brand.dark} />
          </TouchableOpacity>

          {/* Actions */}
          <View style={{ position: 'absolute', top: 16, right: 16, flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={toggleFavorite}
              style={{ backgroundColor: colors.surface, padding: 10, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginRight: 8 }}
            >
              <Heart size={24} color={isFavorite ? "#ef4444" : colors.brand.dark} fill={isFavorite ? "#ef4444" : "transparent"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={{ backgroundColor: colors.surface, padding: 10, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
            >
              <Share2 size={24} color={colors.brand.dark} />
            </TouchableOpacity>
          </View>

          {/* Category Badge */}
          <View style={{ position: 'absolute', bottom: 16, left: 16 }}>
            <View style={{ backgroundColor: colors.brand.gold, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Outfit' }}>
                {business.category}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
          {/* Title & Rating */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Outfit', marginBottom: 8 }}>
              {business.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Star size={18} color={colors.brand.gold} fill={colors.brand.gold} />
              <Text style={{ color: colors.brand.gold, fontSize: 16, fontWeight: 'bold', marginLeft: 8, fontFamily: 'Outfit' }}>
                {business.rating || '4.5'}
              </Text>
              <Text style={{ color: colors.text.tertiary, fontSize: 14, marginLeft: 8, fontFamily: 'Outfit' }}>
                ({business.reviews_count || 0} reviews)
              </Text>
              {!!business.distance_meters && (
                <>
                  <Text style={{ color: colors.border, marginHorizontal: 8 }}>•</Text>
                  <Text style={{ color: colors.text.secondary, fontSize: 14, fontFamily: 'Outfit' }}>
                    {(business.distance_meters / 1000).toFixed(1)} km away
                  </Text>
                </>
              )}
            </View>
            {!!(business.detailed_address || business.address) && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={16} color={colors.brand.gold} />
                <Text style={{ color: colors.text.secondary, fontSize: 14, marginLeft: 6, fontFamily: 'Outfit', flex: 1 }} numberOfLines={2}>
                  {business.detailed_address || business.address}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={{ flexDirection: 'row', marginBottom: 24 }}>
            <TouchableOpacity
              onPress={handleCall}
              style={{ flex: 1, backgroundColor: colors.brand.blue, paddingVertical: 12, borderRadius: 12, marginRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <Phone size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 8, fontFamily: 'Outfit' }}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleWhatsApp}
              style={{ flex: 1, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, marginLeft: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <MessageCircle size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 8, fontFamily: 'Outfit' }}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          {!!business.description && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 8, fontFamily: 'Outfit' }}>About</Text>
              <Text style={{ color: colors.text.secondary, lineHeight: 24, fontFamily: 'Outfit' }}>
                {business.description}
              </Text>
            </View>
          )}

          {/* Contact Information */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 12, fontFamily: 'Outfit' }}>Contact Information</Text>

            {!!business.phone && (
              <TouchableOpacity
                onPress={handleCall}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input.background, padding: 16, borderRadius: 12, marginBottom: 12 }}
              >
                <View style={{ width: 40, height: 40, backgroundColor: colors.brand.blue + '1A', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={20} color={colors.brand.blue} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Outfit' }}>Phone</Text>
                  <Text style={{ color: colors.text.primary, fontWeight: 'bold', fontFamily: 'Outfit' }}>{business.phone}</Text>
                </View>
                <ExternalLink size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}

            {!!business.email && (
              <TouchableOpacity
                onPress={handleEmail}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input.background, padding: 16, borderRadius: 12, marginBottom: 12 }}
              >
                <View style={{ width: 40, height: 40, backgroundColor: colors.brand.blue + '1A', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={20} color={colors.brand.blue} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Outfit' }}>Email</Text>
                  <Text style={{ color: colors.text.primary, fontWeight: 'bold', fontFamily: 'Outfit' }}>{business.email}</Text>
                </View>
                <ExternalLink size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}

            {!!business.website_url && (
              <TouchableOpacity
                onPress={handleWebsite}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input.background, padding: 16, borderRadius: 12, marginBottom: 12 }}
              >
                <View style={{ width: 40, height: 40, backgroundColor: colors.brand.blue + '1A', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={20} color={colors.brand.blue} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Outfit' }}>Website</Text>
                  <Text style={{ color: colors.text.primary, fontWeight: 'bold', fontFamily: 'Outfit' }} numberOfLines={1}>
                    {business.website_name || business.website_url}
                  </Text>
                </View>
                <ExternalLink size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Location */}
          {!!(business.detailed_address || business.address) && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 12, fontFamily: 'Outfit' }}>Location</Text>
              <TouchableOpacity
                onPress={handleDirections}
                style={{ backgroundColor: colors.input.background, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ width: 40, height: 40, backgroundColor: colors.brand.blue + '1A', borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} color={colors.brand.blue} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: colors.text.primary, fontWeight: 'bold', fontFamily: 'Outfit', marginBottom: 4 }}>
                    {business.city || 'Address'}
                  </Text>
                  <Text style={{ color: colors.text.secondary, fontSize: 14, fontFamily: 'Outfit' }}>
                    {business.detailed_address || business.address}
                  </Text>
                </View>
                <Navigation size={20} color={colors.brand.blue} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDirections}
                style={{ marginTop: 12, backgroundColor: colors.brand.blue, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              >
                <Navigation size={20} color="white" />
                <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 8, fontFamily: 'Outfit' }}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Additional Actions */}
          <View style={{ marginBottom: 24 }}>
            <TouchableOpacity
              onPress={handleEmail}
              style={{ backgroundColor: colors.input.background, paddingVertical: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={20} color={colors.brand.blue} />
              <Text style={{ color: colors.text.primary, fontWeight: 'bold', marginLeft: 8, fontFamily: 'Outfit' }}>Send Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowReportModal(true)}
              style={{ backgroundColor: '#fef2f2', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            >
              <Flag size={20} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: 8, fontFamily: 'Outfit' }}>Report Business</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetId={business?.id || ''}
        targetType="business"
        targetName={business?.name}
        userId={userId}
      />
    </SafeAreaView>
  );
};
