import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  X,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  Building2,
  ShieldCheck,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../theme/colors';
import { formatPhoneWithCountryCode, formatPhoneForWhatsApp } from '../utils/phoneHelpers';

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  contact_phone: string;
  created_at: string;
  business_id: string;
  owner_id: string;
  category: string;
  district: string;
  post_type: 'hiring' | 'looking';
  images: string[];
  businesses: {
    name: string;
    logo_url: string;
    is_verified: boolean;
  } | null;
}

interface NewsDetailModalProps {
  post: NewsPost | null;
  currentUserId: string | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (post: NewsPost) => void;
  onDeleted: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  post,
  currentUserId,
  visible,
  onClose,
  onEdit,
  onDeleted,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [imageIndex, setImageIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  if (!post) return null;

  const isOwner = !!currentUserId && currentUserId === post.owner_id;
  const images = post.images ?? [];

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this news post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const { error } = await supabase
                .from('business_news')
                .delete()
                .eq('id', post.id);
              if (error) throw error;
              onClose();
              onDeleted();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete post');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* ── Header ─────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}>
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 8, borderRadius: 20, backgroundColor: colors.input.background }}
          >
            <X size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: '700', color: colors.text.primary, flex: 1, textAlign: 'center', marginHorizontal: 12 }} numberOfLines={1}>
            {post.title}
          </Text>

          {/* Owner actions */}
          {isOwner && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => { onClose(); onEdit(post); }}
                style={{ padding: 8, borderRadius: 20, backgroundColor: colors.brand.blue + '20' }}
              >
                <Pencil size={18} color={colors.brand.blue} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                style={{ padding: 8, borderRadius: 20, backgroundColor: '#fef2f2' }}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#ef4444" />
                  : <Trash2 size={18} color="#ef4444" />}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {/* ── Image carousel ─────────────────────────── */}
          {images.length > 0 && (
            <View style={{ backgroundColor: '#000', position: 'relative' }}>
              <Image
                source={{ uri: images[imageIndex] }}
                style={{ width: SCREEN_W, height: 260 }}
                resizeMode="cover"
              />
              {/* Previous */}
              {imageIndex > 0 && (
                <TouchableOpacity
                  onPress={() => setImageIndex(i => i - 1)}
                  style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: [{ translateY: -20 }],
                    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: 6,
                  }}
                >
                  <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
              )}
              {/* Next */}
              {imageIndex < images.length - 1 && (
                <TouchableOpacity
                  onPress={() => setImageIndex(i => i + 1)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: [{ translateY: -20 }],
                    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: 6,
                  }}
                >
                  <ChevronRight size={24} color="#fff" />
                </TouchableOpacity>
              )}
              {/* Dots */}
              {images.length > 1 && (
                <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                  {images.map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => setImageIndex(i)}>
                      <View style={{
                        width: i === imageIndex ? 20 : 8, height: 8, borderRadius: 4,
                        backgroundColor: i === imageIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                      }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Count badge */}
              {images.length > 1 && (
                <View style={{
                  position: 'absolute', top: 12, right: 12,
                  backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12,
                  paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{ color: '#fff', fontFamily: 'Outfit', fontSize: 12 }}>
                    {imageIndex + 1} / {images.length}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ padding: 20 }}>
            {/* ── Type badge + District ──────────────────── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View style={{
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                backgroundColor: post.post_type === 'hiring' ? '#eff6ff' : '#ecfdf5',
              }}>
                <Text style={{
                  fontFamily: 'Outfit', fontWeight: '700', fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: 0.8,
                  color: post.post_type === 'hiring' ? '#3b82f6' : '#10b981',
                }}>
                  {post.post_type === 'hiring' ? 'Hiring' : 'Looking'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={13} color={colors.text.tertiary} />
                <Text style={{ fontFamily: 'Outfit', fontSize: 13, color: colors.text.tertiary, marginLeft: 4 }}>
                  {post.district}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={{ backgroundColor: colors.input.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: 'Outfit', fontSize: 11, color: colors.text.secondary }}>
                    {post.category}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Title ─────────────────────────────────── */}
            <Text style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: '700', color: colors.text.primary, lineHeight: 30, marginBottom: 16 }}>
              {post.title}
            </Text>

            {/* ── Business info ──────────────────────────── */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: colors.border, marginBottom: 20,
            }}>
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors.input.background, alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' }}>
                {post.businesses?.logo_url
                  ? <Image source={{ uri: post.businesses.logo_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  : <Building2 size={22} color={colors.text.tertiary} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 15, color: colors.text.primary }}>
                    {post.businesses?.name ?? 'Unknown Business'}
                  </Text>
                  {post.businesses?.is_verified && (
                    <ShieldCheck size={14} color="#3b82f6" style={{ marginLeft: 5 }} />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Clock size={11} color={colors.text.tertiary} />
                  <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.tertiary, marginLeft: 4 }}>
                    {formatDate(post.created_at)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Full content ───────────────────────────── */}
            <Text style={{ fontFamily: 'Outfit', fontSize: 15, color: colors.text.secondary, lineHeight: 24, marginBottom: 24 }}>
              {post.content}
            </Text>

            {/* ── Contact actions ────────────────────────── */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${formatPhoneWithCountryCode(post.contact_phone)}`)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: colors.brand.blue, borderRadius: 14, paddingVertical: 16,
                }}
              >
                <Phone size={18} color="#fff" />
                <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 15, color: '#fff', marginLeft: 10 }}>
                  Call  {post.contact_phone}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL(`https://wa.me/${formatPhoneForWhatsApp(post.contact_phone)}`)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 16,
                }}
              >
                <MessageSquare size={18} color="#fff" />
                <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 15, color: '#fff', marginLeft: 10 }}>
                  WhatsApp
                </Text>
              </TouchableOpacity>
            </View>

            {/* Owner hint */}
            {isOwner && (
              <View style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: colors.brand.blue + '12', borderWidth: 1, borderColor: colors.brand.blue + '30' }}>
                <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.secondary, textAlign: 'center' }}>
                  ✏️  Tap the edit icon above to update this post, or 🗑 to delete it.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
