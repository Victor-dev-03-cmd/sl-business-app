import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, ImageIcon, Trash2, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../theme/colors';
import { NewsPost } from './NewsDetailModal';

const MAIN_CATEGORY_GROUPS = [
  'Manpower Services', 'Care & Lifestyle', 'Professional & Finance',
  'Construction & Industrial', 'Technical & Electronics',
  'Events, Food & Leisure', 'Travel & Transport', 'Retail & Others',
];

const SRI_LANKAN_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

interface LocalImage {
  uri: string;
  mimeType: string;
  isExisting: boolean; // true = already uploaded URL, false = new local pick
}

interface EditNewsModalProps {
  post: NewsPost | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const EditNewsModal: React.FC<EditNewsModalProps> = ({ post, visible, onClose, onSaved }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [category, setCategory] = useState(MAIN_CATEGORY_GROUPS[0]);
  const [district, setDistrict] = useState('Colombo');
  const [postType, setPostType] = useState<'hiring' | 'looking'>('hiring');
  const [images, setImages] = useState<LocalImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Pre-fill form when post changes
  useEffect(() => {
    if (post && visible) {
      setTitle(post.title);
      setContent(post.content);
      setContactPhone(post.contact_phone);
      setCategory(post.category ?? MAIN_CATEGORY_GROUPS[0]);
      setDistrict(post.district ?? 'Colombo');
      setPostType(post.post_type ?? 'hiring');
      // Existing images shown as already-uploaded URIs
      setImages((post.images ?? []).map(url => ({ uri: url, mimeType: 'image/jpeg', isExisting: true })));
      setUploadProgress(0);
    }
  }, [post, visible]);

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Maximum reached', 'You can have up to 5 images.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newImgs = result.assets.map(a => ({
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
        isExisting: false,
      }));
      setImages(prev => [...prev, ...newImgs].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadNewImages = async (userId: string): Promise<string[]> => {
    const urls: string[] = [];
    const newOnes = images.filter(img => !img.isExisting);
    let progress = 0;

    for (const img of newOnes) {
      const ext = img.mimeType.split('/')[1] ?? img.uri.split('.').pop() ?? 'jpg';
      const filePath = `posts/${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      const formData = new FormData();
      formData.append('file', { uri: img.uri, name: `image.${ext}`, type: img.mimeType } as any);

      const { error } = await supabase.storage
        .from('news-images')
        .upload(filePath, formData, { contentType: img.mimeType, upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('news-images').getPublicUrl(filePath);
      urls.push(publicUrl);

      progress += 100 / newOnes.length;
      setUploadProgress(Math.min(Math.round(progress), 100));
    }

    return urls;
  };

  const handleSave = async () => {
    if (!post) return;
    if (!title.trim()) { Alert.alert('Required', 'Title is required'); return; }
    if (title.length < 10) { Alert.alert('Error', 'Title must be at least 10 characters'); return; }
    if (!content.trim()) { Alert.alert('Required', 'Content is required'); return; }
    if (content.length < 20) { Alert.alert('Error', 'Content must be at least 20 characters'); return; }
    if (!contactPhone.trim()) { Alert.alert('Required', 'Contact phone is required'); return; }

    try {
      setSaving(true);
      setUploadProgress(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload only the new (local) images
      const newUrls = await uploadNewImages(user.id);

      // Build final image list: keep existing URL strings + add new uploaded URLs
      const finalImages = [
        ...images.filter(img => img.isExisting).map(img => img.uri),
        ...newUrls,
      ];

      const { error } = await supabase
        .from('business_news')
        .update({
          title: title.trim(),
          content: content.trim(),
          contact_phone: contactPhone.trim(),
          category,
          district,
          post_type: postType,
          images: finalImages,
        })
        .eq('id', post.id);

      if (error) throw error;

      onClose();
      onSaved();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        {/* Header */}
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
          <Text style={{ fontFamily: 'Outfit', fontSize: 17, fontWeight: '700', color: colors.text.primary }}>
            Edit Post
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
              backgroundColor: saving ? colors.text.tertiary : colors.brand.blue,
            }}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Save size={16} color="#fff" />}
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 13, color: '#fff' }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">

          {/* Post Type */}
          <Label text="Post Type" colors={colors} />
          <View style={{ flexDirection: 'row', backgroundColor: colors.input.background, borderRadius: 14, padding: 4, marginBottom: 16 }}>
            {(['hiring', 'looking'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setPostType(t)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 10,
                  backgroundColor: postType === t ? colors.brand.blue : 'transparent',
                }}
              >
                <Text style={{ textAlign: 'center', fontFamily: 'Outfit', fontWeight: '700', fontSize: 14, color: postType === t ? '#fff' : colors.text.secondary }}>
                  {t === 'hiring' ? 'Hiring' : 'Looking'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Label text={`Title * (${title.length}/100)`} colors={colors} />
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholder="e.g. Hiring Delivery Drivers – Colombo"
            placeholderTextColor={colors.text.tertiary}
            style={inputStyle(colors)}
          />
          <View style={{ height: 14 }} />

          {/* Content */}
          <Label text={`Content * (${content.length}/500)`} colors={colors} />
          <TextInput
            value={content}
            onChangeText={setContent}
            maxLength={500}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholder="Describe your requirements…"
            placeholderTextColor={colors.text.tertiary}
            style={[inputStyle(colors), { minHeight: 110 }]}
          />
          <View style={{ height: 14 }} />

          {/* Photos */}
          <Label text={`Photos (${images.length}/5)`} colors={colors} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {images.map((img, idx) => (
              <View key={idx} style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => removeImage(idx)}
                  style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: 4 }}
                >
                  <Trash2 size={12} color="#fff" />
                </TouchableOpacity>
                {!img.isExisting && (
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.brand.blue + 'cc', paddingVertical: 2 }}>
                    <Text style={{ fontFamily: 'Outfit', fontSize: 9, color: '#fff', textAlign: 'center' }}>New</Text>
                  </View>
                )}
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImages}
                style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.input.background, alignItems: 'center', justifyContent: 'center' }}
              >
                <ImageIcon size={22} color={colors.text.tertiary} />
                <Text style={{ fontFamily: 'Outfit', fontSize: 10, fontWeight: '700', color: colors.text.tertiary, marginTop: 4, textTransform: 'uppercase' }}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Contact Phone */}
          <Label text="Contact Phone *" colors={colors} />
          <TextInput
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            placeholder="0771234567"
            placeholderTextColor={colors.text.tertiary}
            style={inputStyle(colors)}
          />
          <View style={{ height: 14 }} />

          {/* Category */}
          <Label text="Category" colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {MAIN_CATEGORY_GROUPS.map(cat => {
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={{ marginRight: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: active ? colors.brand.blue : colors.input.background, borderColor: active ? colors.brand.blue : colors.border }}
                >
                  <Text style={{ fontFamily: 'Outfit', fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.text.secondary }}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* District */}
          <Label text="District" colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            {SRI_LANKAN_DISTRICTS.map(d => {
              const active = district === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDistrict(d)}
                  style={{ marginRight: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: active ? colors.brand.blue : colors.input.background, borderColor: active ? colors.brand.blue : colors.border }}
                >
                  <Text style={{ fontFamily: 'Outfit', fontSize: 12, fontWeight: '700', color: active ? '#fff' : colors.text.secondary }}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Upload progress */}
          {saving && images.some(i => !i.isExisting) && uploadProgress < 100 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.secondary }}>Uploading photos…</Text>
                <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.brand.blue }}>{uploadProgress}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                <View style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: colors.brand.blue, borderRadius: 3 }} />
              </View>
            </View>
          )}

          {/* Save button (duplicate at bottom for long forms) */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, backgroundColor: saving ? colors.text.tertiary : colors.brand.blue }}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" />}
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 16, color: '#fff', marginLeft: 10 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── helpers ─────────────────────────────────────────────────────────────────
const Label = ({ text, colors }: { text: string; colors: any }) => (
  <Text style={{ fontFamily: 'Outfit', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.text.tertiary, marginBottom: 8 }}>
    {text}
  </Text>
);

const inputStyle = (colors: any) => ({
  backgroundColor: colors.input.background,
  borderWidth: 1, borderColor: colors.border,
  borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  fontFamily: 'Outfit', fontSize: 15, color: colors.text.primary,
});
