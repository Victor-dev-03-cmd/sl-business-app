import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Building2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';
import * as DocumentPicker from 'expo-document-picker';

interface Business {
  id: string;
  name: string;
  is_verified: boolean;
  verification_status: string;
}

interface Verification {
  id: string;
  status: string;
  br_document_url?: string;
  nic_passport_url?: string;
  business_type?: string;
  br_number?: string;
  tin_number?: string;
  svat_number?: string;
  rejection_reason?: string;
  created_at: string;
}

export const VendorVerificationScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [verification, setVerification] = useState<Verification | null>(null);

  // Form state
  const [businessType, setBusinessType] = useState<'pvt_ltd' | 'local_business'>('pvt_ltd');
  const [brNumber, setBrNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [svatNumber, setSvatNumber] = useState('');
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's businesses
      const { data: businessData, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, is_verified, verification_status')
        .eq('owner_id', user.id);

      if (bizError) throw bizError;

      if (businessData && businessData.length > 0) {
        setBusinesses(businessData);
        const firstBusiness = businessData[0];
        setSelectedBusinessId(firstBusiness.id);

        // Fetch verification for first business
        await fetchVerification(firstBusiness.id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const fetchVerification = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('verifications')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setVerification(data);
        setBusinessType(data.business_type || 'pvt_ltd');
        setBrNumber(data.br_number || '');
        setTinNumber(data.tin_number || '');
        setSvatNumber(data.svat_number || '');
      } else {
        setVerification(null);
        setBrNumber('');
        setTinNumber('');
        setSvatNumber('');
      }
    } catch (error) {
      console.error('Error fetching verification:', error);
    }
  };

  const handleBusinessChange = async (businessId: string) => {
    setSelectedBusinessId(businessId);
    await fetchVerification(businessId);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success' || !result.canceled) {
        const file = result.assets ? result.assets[0] : result;
        setDocumentUri(file.uri);
        setDocumentName(file.name);
        setDocumentFile(file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const validateBRNumber = (): boolean => {
    const pvtRegex = /^PV\d{8}$/;
    const localRegex = /^\d+\/\d{4}\/\w+$/;

    if (businessType === 'pvt_ltd' && !pvtRegex.test(brNumber)) {
      Alert.alert('Invalid BR Number', 'Format should be: PV00212345');
      return false;
    }

    if (businessType === 'local_business' && !localRegex.test(brNumber)) {
      Alert.alert('Invalid BR Number', 'Format should be: [Number]/[Year]/[Code]\nExample: 123/2020/ABC');
      return false;
    }

    return true;
  };

  const handleSubmitVerification = async () => {
    // Validation
    if (!selectedBusinessId) {
      Alert.alert('Error', 'Please select a business to verify');
      return;
    }

    if (!brNumber.trim()) {
      Alert.alert('Error', 'Please enter your Business Registration Number');
      return;
    }

    if (!validateBRNumber()) {
      return;
    }

    if (!documentFile) {
      Alert.alert('Error', 'Please upload your BR certificate or registration document');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload document to Supabase Storage
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${selectedBusinessId}-${user.id}-${Date.now()}.${fileExt}`;

      // For React Native, we need to create a File/Blob from the URI
      const response = await fetch(documentFile.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, blob, {
          contentType: documentFile.mimeType || 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(fileName);

      // Insert verification record
      const { error: verificationError } = await supabase
        .from('verifications')
        .insert({
          business_id: selectedBusinessId,
          user_id: user.id,
          business_type: businessType,
          br_number: brNumber.trim(),
          tin_number: tinNumber.trim() || null,
          svat_number: svatNumber.trim() || null,
          br_document_url: publicUrl,
          status: 'pending',
        });

      if (verificationError) throw verificationError;

      // Update business verification status
      await supabase
        .from('businesses')
        .update({ verification_status: 'pending' })
        .eq('id', selectedBusinessId);

      Alert.alert(
        'Success',
        'Verification submitted successfully! Our team will review your documents within 24-48 hours.',
        [{ text: 'OK', onPress: () => fetchData() }]
      );

      // Clear form
      setDocumentUri(null);
      setDocumentName(null);
      setDocumentFile(null);
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      Alert.alert('Error', error.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified':
      case 'approved':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return colors.text.tertiary;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
      case 'approved':
        return CheckCircle;
      case 'pending':
        return Clock;
      case 'rejected':
        return AlertTriangle;
      default:
        return ShieldCheck;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand.blue} />
          <Text className="mt-4 text-base font-outfit" style={{ color: colors.text.secondary }}>
            Loading verification status...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (businesses.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="px-6 py-4 border-b flex-row items-center" style={{ borderBottomColor: colors.border }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="text-xl font-outfit" style={{ color: colors.text.primary }}>
            Verification
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Building2 size={64} color={colors.text.tertiary} />
          <Text className="text-xl font-outfit mt-6 text-center" style={{ color: colors.text.primary }}>
            No Businesses Found
          </Text>
          <Text className="text-sm font-outfit mt-3 text-center" style={{ color: colors.text.secondary }}>
            Please register a business first before applying for verification
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);
  const isVerified = selectedBusiness?.is_verified || verification?.status === 'approved';
  const isPending = verification?.status === 'pending';
  const isRejected = verification?.status === 'rejected';
  const StatusIcon = getStatusIcon(verification?.status || selectedBusiness?.verification_status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="px-6 py-4 border-b flex-row items-center justify-between" style={{ borderBottomColor: colors.border }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <ArrowLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-outfit" style={{ color: colors.text.primary }}>
              Business Verification
            </Text>
            <Text className="text-xs font-outfit mt-1" style={{ color: colors.text.secondary }}>
              Verify your business to unlock features
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        {/* Status Card */}
        {verification && (
          <View
            className="p-4 rounded-xl mb-6 border"
            style={{
              backgroundColor: colors.surface,
              borderColor: getStatusColor(verification.status) + '30',
            }}
          >
            <View className="flex-row items-center mb-2">
              <StatusIcon size={20} color={getStatusColor(verification.status)} />
              <Text className="text-base font-outfit font-bold ml-2" style={{ color: getStatusColor(verification.status) }}>
                {verification.status === 'approved' ? 'Verified' : verification.status === 'pending' ? 'Under Review' : 'Rejected'}
              </Text>
            </View>
            <Text className="text-sm font-outfit" style={{ color: colors.text.secondary }}>
              {verification.status === 'approved' && 'Your business is verified! You have access to all features.'}
              {verification.status === 'pending' && 'Your verification is under review. We\'ll notify you once approved.'}
              {verification.status === 'rejected' && `Verification rejected: ${verification.rejection_reason || 'Please resubmit with correct documents'}`}
            </Text>
          </View>
        )}

        {/* Business Selection */}
        <View className="mb-6">
          <Text className="text-xs font-outfit mb-3 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
            Select Business to Verify
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-1">
            {businesses.map((business) => (
              <TouchableOpacity
                key={business.id}
                onPress={() => handleBusinessChange(business.id)}
                className="mx-1 px-4 py-3 rounded-lg flex-row items-center"
                style={{
                  backgroundColor: selectedBusinessId === business.id ? colors.brand.blue : colors.surface,
                  borderWidth: 1,
                  borderColor: selectedBusinessId === business.id ? colors.brand.blue : colors.border,
                }}
              >
                {business.is_verified && (
                  <CheckCircle
                    size={16}
                    color={selectedBusinessId === business.id ? '#ffffff' : '#10b981'}
                    fill={selectedBusinessId === business.id ? '#ffffff' : '#10b981'}
                  />
                )}
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

        {/* Business Type */}
        <View className="mb-6">
          <Text className="text-xs font-outfit mb-3 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
            Business Type *
          </Text>
          <View className="flex-row rounded-xl p-1" style={{ backgroundColor: colors.input.background }}>
            <TouchableOpacity
              onPress={() => setBusinessType('pvt_ltd')}
              disabled={isVerified || isPending}
              className="flex-1 py-3 rounded-lg"
              style={{ backgroundColor: businessType === 'pvt_ltd' ? colors.brand.blue : 'transparent' }}
            >
              <Text className="text-center text-sm font-outfit font-bold" style={{ color: businessType === 'pvt_ltd' ? '#ffffff' : colors.text.secondary }}>
                Private Ltd
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBusinessType('local_business')}
              disabled={isVerified || isPending}
              className="flex-1 py-3 rounded-lg"
              style={{ backgroundColor: businessType === 'local_business' ? colors.brand.blue : 'transparent' }}
            >
              <Text className="text-center text-sm font-outfit font-bold" style={{ color: businessType === 'local_business' ? '#ffffff' : colors.text.secondary }}>
                Local Business
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BR Number */}
        <View className="mb-4">
          <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
            Business Registration Number *
          </Text>
          <TextInput
            value={brNumber}
            onChangeText={setBrNumber}
            placeholder={businessType === 'pvt_ltd' ? 'PV00212345' : '123/2020/ABC'}
            placeholderTextColor={colors.text.tertiary}
            editable={!isVerified && !isPending}
            className="px-4 py-3 rounded-xl text-base font-outfit"
            style={{
              backgroundColor: colors.input.background,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text.primary,
            }}
          />
          <Text className="text-xs font-outfit mt-1" style={{ color: colors.text.tertiary }}>
            {businessType === 'pvt_ltd' ? 'Format: PV followed by 8 digits' : 'Format: Number/Year/Code'}
          </Text>
        </View>

        {/* TIN Number (Optional) */}
        <View className="mb-4">
          <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
            TIN Number (Optional)
          </Text>
          <TextInput
            value={tinNumber}
            onChangeText={setTinNumber}
            placeholder="Tax Identification Number"
            placeholderTextColor={colors.text.tertiary}
            editable={!isVerified && !isPending}
            className="px-4 py-3 rounded-xl text-base font-outfit"
            style={{
              backgroundColor: colors.input.background,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text.primary,
            }}
          />
        </View>

        {/* SVAT Number (Optional) */}
        <View className="mb-6">
          <Text className="text-xs font-outfit mb-2 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
            SVAT Number (Optional)
          </Text>
          <TextInput
            value={svatNumber}
            onChangeText={setSvatNumber}
            placeholder="Service VAT Number"
            placeholderTextColor={colors.text.tertiary}
            editable={!isVerified && !isPending}
            className="px-4 py-3 rounded-xl text-base font-outfit"
            style={{
              backgroundColor: colors.input.background,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text.primary,
            }}
          />
        </View>

        {/* Document Upload */}
        <View className="mb-6">
          <Text className="text-xs font-outfit mb-3 uppercase tracking-wide" style={{ color: colors.text.tertiary }}>
            Upload BR Certificate *
          </Text>
          <TouchableOpacity
            onPress={handlePickDocument}
            disabled={isVerified || isPending}
            className="p-6 rounded-xl border-2 border-dashed items-center"
            style={{ borderColor: colors.border, backgroundColor: colors.input.background }}
          >
            {documentName ? (
              <>
                <FileText size={32} color={colors.brand.blue} />
                <Text className="text-sm font-outfit mt-3 text-center" style={{ color: colors.text.primary }}>
                  {documentName}
                </Text>
                <Text className="text-xs font-outfit mt-1" style={{ color: colors.text.secondary }}>
                  Tap to change
                </Text>
              </>
            ) : (
              <>
                <Upload size={32} color={colors.text.tertiary} />
                <Text className="text-sm font-outfit mt-3" style={{ color: colors.text.secondary }}>
                  Tap to upload document
                </Text>
                <Text className="text-xs font-outfit mt-1" style={{ color: colors.text.tertiary }}>
                  PDF or Image (Max 10MB)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View className="p-4 rounded-xl mb-6" style={{ backgroundColor: colors.brand.blue + '15', borderWidth: 1, borderColor: colors.brand.blue + '30' }}>
          <Text className="text-xs font-outfit font-bold mb-2" style={{ color: colors.text.primary }}>
            📋 Required Documents:
          </Text>
          <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
            • Business Registration Certificate{'\n'}
            • Clear photo or PDF{'\n'}
            • Valid and not expired{'\n'}
            • Admin will review within 24-48 hours
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmitVerification}
          disabled={submitting || isVerified || isPending}
          className="py-4 rounded-xl flex-row items-center justify-center"
          style={{
            backgroundColor: isVerified || isPending ? colors.text.tertiary : colors.brand.blue,
          }}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className="text-white font-outfit font-bold ml-2">Submitting...</Text>
            </>
          ) : (
            <>
              <ShieldCheck size={20} color="#ffffff" />
              <Text className="text-white font-outfit font-bold ml-2">
                {isVerified ? 'Verified' : isPending ? 'Under Review' : 'Submit for Verification'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {isRejected && (
          <TouchableOpacity
            onPress={() => {
              setVerification(null);
              setBrNumber('');
              setDocumentUri(null);
              setDocumentName(null);
              setDocumentFile(null);
            }}
            className="mt-4 py-4 rounded-xl flex-row items-center justify-center"
            style={{ backgroundColor: colors.brand.blue + '20', borderWidth: 1, borderColor: colors.brand.blue }}
          >
            <Text className="font-outfit font-bold" style={{ color: colors.brand.blue }}>
              Resubmit Verification
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
