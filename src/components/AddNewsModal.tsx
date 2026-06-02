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
import { X, Plus, AlertCircle, CheckCircle, ImageIcon, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../theme/colors';

interface ImageAsset {
  uri: string;
  mimeType: string;
}

interface UserBusiness {
  id: string;
  name: string;
  is_verified: boolean;
}

interface AddNewsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAIN_CATEGORY_GROUPS = [
  'Manpower Services',
  'Care & Lifestyle',
  'Professional & Finance',
  'Construction & Industrial',
  'Technical & Electronics',
  'Events, Food & Leisure',
  'Travel & Transport',
  'Retail & Others',
];

const SRI_LANKAN_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

export const AddNewsModal: React.FC<AddNewsModalProps> = ({ visible, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [userBusinesses, setUserBusinesses] = useState<UserBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [category, setCategory] = useState(MAIN_CATEGORY_GROUPS[0]);
  const [district, setDistrict] = useState('Colombo');
  const [postType, setPostType] = useState<'hiring' | 'looking'>('hiring');

  // Image state — max 5, same as web
  const [selectedImages, setSelectedImages] = useState<ImageAsset[]>([]);

  useEffect(() => {
    if (visible) {
      fetchUserBusinesses();
      // Reset images whenever modal opens
      setSelectedImages([]);
      setUploadProgress(0);
    }
  }, [visible]);

  const pickImages = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert('Maximum reached', 'You can upload up to 5 images.');
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
      selectionLimit: 5 - selectedImages.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const incoming = result.assets.map(a => ({
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
      }));
      setSelectedImages(prev => [...prev, ...incoming].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadNewsImages = async (userId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    let progress = 0;

    for (const img of selectedImages) {
      const ext = img.mimeType.split('/')[1] ?? img.uri.split('.').pop() ?? 'jpg';
      // Same path structure as web: posts/{userId}/{timestamp}-{random}.{ext}
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const filePath = `posts/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: img.uri,
        name: `image.${ext}`,
        type: img.mimeType,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('news-images')
        .upload(filePath, formData, { contentType: img.mimeType, upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('news-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
      progress += 100 / selectedImages.length;
      setUploadProgress(Math.min(Math.round(progress), 100));
    }

    return uploadedUrls;
  };

  const fetchUserBusinesses = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, is_verified')
        .eq('owner_id', user.id)
        .eq('is_verified', true)
        .eq('status', 'approved');

      if (error) throw error;

      setUserBusinesses(data || []);
      if (data && data.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching user businesses:', error);
      Alert.alert('Error', 'Failed to load your businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedBusinessId || !title.trim() || !content.trim() || !contactPhone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (title.length < 10) {
      Alert.alert('Error', 'Title must be at least 10 characters');
      return;
    }

    if (content.length < 20) {
      Alert.alert('Error', 'Content must be at least 20 characters');
      return;
    }

    try {
      setSubmitting(true);
      setUploadProgress(0);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Upload images first (same as web)
      const uploadedUrls = selectedImages.length > 0
        ? await uploadNewsImages(user.id)
        : [];

      // 2. Insert post with image URLs
      const { error } = await supabase
        .from('business_news')
        .insert({
          business_id: selectedBusinessId,
          owner_id: user.id,
          title: title.trim(),
          content: content.trim(),
          contact_phone: contactPhone.trim(),
          category,
          district,
          post_type: postType,
          images: uploadedUrls,
        });

      if (error) throw error;

      // Reset form
      setTitle('');
      setContent('');
      setContactPhone('');
      setCategory(MAIN_CATEGORY_GROUPS[0]);
      setDistrict('Colombo');
      setPostType('hiring');
      setSelectedImages([]);
      setUploadProgress(0);

      Alert.alert(
        'Success',
        'Your news post has been submitted and is pending admin approval.',
        [{ text: 'OK', onPress: () => { onClose(); onSuccess(); } }]
      );
    } catch (error: any) {
      console.error('Error submitting news:', error);
      Alert.alert('Error', error.message || 'Failed to submit news post');
    } finally {
      setSubmitting(false);
    }
  };

  const renderVerificationRequired = () => (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <AlertCircle size={64} color={colors.text.tertiary} />
      <Text className="text-xl font-outfit mt-6 text-center" style={{ color: colors.text.primary }}>
        Verification Required
      </Text>
      <Text className="text-sm font-outfit mt-3 text-center" style={{ color: colors.text.secondary }}>
        Only verified businesses can post news updates.
      </Text>
      <Text className="text-xs font-outfit mt-6 text-center" style={{ color: colors.text.tertiary }}>
        To get verified, please ensure your business is approved and has completed the verification process.
      </Text>
      <TouchableOpacity
        onPress={onClose}
        className="mt-8 px-8 py-3 rounded-lg"
        style={{ backgroundColor: colors.brand.blue }}
      >
        <Text className="text-white font-outfit font-bold">Close</Text>
      </TouchableOpacity>
    </View>
  );

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
        <View className="px-6 py-4 border-b flex-row items-center justify-between" style={{ borderBottomColor: colors.border }}>
          <View>
            <Text className="text-xl font-outfit" style={{ color: colors.text.primary }}>
              Add News Update
            </Text>
            <Text className="text-xs font-outfit mt-1" style={{ color: colors.text.secondary }}>
              Post hiring or business updates
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.input.background }}>
            <X size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand.blue} />
            <Text className="mt-4 text-sm font-outfit" style={{ color: colors.text.secondary }}>
              Loading your businesses...
            </Text>
          </View>
        ) : userBusinesses.length === 0 ? (
          renderVerificationRequired()
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
            {/* Business Selection */}
            <View className="mb-4">
              <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
                Select Business *
              </Text>
              <View className="rounded-xl border" style={{ backgroundColor: colors.input.background, borderColor: colors.border }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2">
                  {userBusinesses.map((business) => (
                    <TouchableOpacity
                      key={business.id}
                      onPress={() => setSelectedBusinessId(business.id)}
                      className="mr-2 px-4 py-3 rounded-lg flex-row items-center"
                      style={{
                        backgroundColor: selectedBusinessId === business.id ? colors.brand.blue : colors.surface,
                        borderWidth: 1,
                        borderColor: selectedBusinessId === business.id ? colors.brand.blue : colors.border,
                      }}
                    >
                      <CheckCircle
                        size={16}
                        color={selectedBusinessId === business.id ? '#ffffff' : colors.text.tertiary}
                        fill={selectedBusinessId === business.id ? '#ffffff' : 'transparent'}
                      />
                      <Text
                        className="text-sm font-outfit ml-2"
                        style={{ color: selectedBusinessId === business.id ? '#ffffff' : colors.text.primary }}
                      >
                        {business.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Post Type */}
            <View className="mb-4">
              <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
                Post Type *
              </Text>
              <View className="flex-row rounded-xl p-1" style={{ backgroundColor: colors.input.background }}>
                <TouchableOpacity
                  onPress={() => setPostType('hiring')}
                  className="flex-1 py-3 rounded-lg"
                  style={{ backgroundColor: postType === 'hiring' ? colors.brand.blue : 'transparent' }}
                >
                  <Text className="text-center text-sm font-outfit font-bold" style={{ color: postType === 'hiring' ? '#ffffff' : colors.text.secondary }}>
                    Hiring
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPostType('looking')}
                  className="flex-1 py-3 rounded-lg"
                  style={{ backgroundColor: postType === 'looking' ? colors.brand.blue : 'transparent' }}
                >
                  <Text className="text-center text-sm font-outfit font-bold" style={{ color: postType === 'looking' ? '#ffffff' : colors.text.secondary }}>
                    Looking
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Title */}
            <View className="mb-4">
              <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
                Title * (min. 10 characters)
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Hiring Delivery Drivers - Colombo"
                placeholderTextColor={colors.text.tertiary}
                className="px-4 py-3 rounded-xl text-base font-outfit"
                style={{
                  backgroundColor: colors.input.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text.primary,
                }}
                maxLength={100}
              />
              <Text className="text-xs font-outfit mt-1" style={{ color: colors.text.tertiary }}>
                {title.length}/100
              </Text>
            </View>

            {/* Content */}
            <View className="mb-4">
              <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
                Content * (min. 20 characters)
              </Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Describe your requirements or what you're offering..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="px-4 py-3 rounded-xl text-base font-outfit"
                style={{
                  backgroundColor: colors.input.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text.primary,
                  minHeight: 120,
                }}
                maxLength={500}
              />
              <Text className="text-xs font-outfit mt-1" style={{ color: colors.text.tertiary }}>
                {content.length}/500
              </Text>
            </View>

            {/* Photos — up to 5, same as web */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Outfit', textTransform: 'uppercase', letterSpacing: 1, color: colors.text.tertiary, marginBottom: 10 }}>
                Photos (up to 5) — Optional
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {/* Previews */}
                {selectedImages.map((img, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: 80, height: 80, borderRadius: 12,
                      overflow: 'hidden', backgroundColor: colors.input.background,
                      borderWidth: 1, borderColor: colors.border,
                    }}
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    {/* Delete button */}
                    <TouchableOpacity
                      onPress={() => removeImage(idx)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add button — hidden when 5 images selected */}
                {selectedImages.length < 5 && (
                  <TouchableOpacity
                    onPress={pickImages}
                    style={{
                      width: 80, height: 80, borderRadius: 12,
                      borderWidth: 2, borderStyle: 'dashed',
                      borderColor: colors.border, backgroundColor: colors.input.background,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ImageIcon size={22} color={colors.text.tertiary} />
                    <Text style={{ fontFamily: 'Outfit', fontSize: 10, fontWeight: '700', color: colors.text.tertiary, marginTop: 4, textTransform: 'uppercase' }}>
                      Add
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedImages.length > 0 && (
                <Text style={{ fontFamily: 'Outfit', fontSize: 11, color: colors.text.tertiary, marginTop: 6 }}>
                  {selectedImages.length}/5 photo{selectedImages.length !== 1 ? 's' : ''} selected
                </Text>
              )}
            </View>

            {/* Contact Phone */}
            <View className="mb-4">
              <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
                Contact Phone *
              </Text>
              <TextInput
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="0771234567"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="phone-pad"
                className="px-4 py-3 rounded-xl text-base font-outfit"
                style={{
                  backgroundColor: colors.input.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text.primary,
                }}
              />
            </View>

            {/* Category */}
            <View className="mb-4">
              <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
                Category *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-1">
                {MAIN_CATEGORY_GROUPS.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className="mx-1 px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: category === cat ? colors.brand.blue : colors.input.background,
                      borderWidth: 1,
                      borderColor: category === cat ? colors.brand.blue : colors.border,
                    }}
                  >
                    <Text
                      className="text-xs font-outfit font-bold"
                      style={{ color: category === cat ? '#ffffff' : colors.text.secondary }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* District */}
            <View className="mb-6">
              <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
                District *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-1">
                {SRI_LANKAN_DISTRICTS.map((dist) => (
                  <TouchableOpacity
                    key={dist}
                    onPress={() => setDistrict(dist)}
                    className="mx-1 px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: district === dist ? colors.brand.blue : colors.input.background,
                      borderWidth: 1,
                      borderColor: district === dist ? colors.brand.blue : colors.border,
                    }}
                  >
                    <Text
                      className="text-xs font-outfit font-bold"
                      style={{ color: district === dist ? '#ffffff' : colors.text.secondary }}
                    >
                      {dist}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Info Box */}
            <View className="p-4 rounded-xl mb-6" style={{ backgroundColor: colors.brand.blue + '15', borderWidth: 1, borderColor: colors.brand.blue + '30' }}>
              <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                📋 Your post will be reviewed by admin before publishing. Only verified businesses can post news updates.
              </Text>
            </View>

            {/* Upload progress bar — visible only while uploading images */}
            {submitting && selectedImages.length > 0 && uploadProgress < 100 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.secondary }}>
                    Uploading photos…
                  </Text>
                  <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.brand.blue }}>
                    {uploadProgress}%
                  </Text>
                </View>
                <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: colors.brand.blue, borderRadius: 3 }} />
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className="py-4 rounded-xl flex-row items-center justify-center"
              style={{
                backgroundColor: submitting ? colors.text.tertiary : colors.brand.blue,
              }}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text className="text-white font-outfit font-bold ml-2">
                    {selectedImages.length > 0 && uploadProgress < 100 ? 'Uploading...' : 'Submitting...'}
                  </Text>
                </>
              ) : (
                <>
                  <Plus size={20} color="#ffffff" />
                  <Text className="text-white font-outfit font-bold ml-2">Submit News Post</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};
