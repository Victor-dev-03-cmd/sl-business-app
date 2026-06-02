import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  FileText,
  RefreshCw,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';

interface Business {
  id: string;
  name: string;
  is_verified: boolean;
  verification_status: string;
}

interface Verification {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  br_document_url?: string;
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

  // Form state — mirrors web page exactly
  const [businessType, setBusinessType] = useState<'pvt_ltd' | 'local_business'>('pvt_ltd');
  const [brNumber, setBrNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [svatNumber, setSvatNumber] = useState('');
  const [docUri, setDocUri] = useState<string | null>(null);
  const [docMime, setDocMime] = useState<string>('image/jpeg');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bizData, error: bizErr } = await supabase
        .from('businesses')
        .select('id, name, is_verified, verification_status')
        .eq('owner_id', user.id);

      if (bizErr) throw bizErr;

      if (bizData && bizData.length > 0) {
        setBusinesses(bizData);
        const first = bizData[0];
        setSelectedBusinessId(first.id);
        await loadVerification(first.id);
      } else {
        setBusinesses([]);
      }
    } catch (err) {
      console.error('fetchData error:', err);
      Alert.alert('Error', 'Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const loadVerification = async (businessId: string) => {
    const { data, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('loadVerification error:', error);
      return;
    }

    if (data) {
      setVerification(data as Verification);
      setBusinessType(data.business_type || 'pvt_ltd');
      setBrNumber(data.br_number || '');
      setTinNumber(data.tin_number || '');
      setSvatNumber(data.svat_number || '');
    } else {
      setVerification(null);
      setBusinessType('pvt_ltd');
      setBrNumber('');
      setTinNumber('');
      setSvatNumber('');
    }
    // Clear any previously picked doc when switching businesses
    setDocUri(null);
  };

  const handleSelectBusiness = async (id: string) => {
    setSelectedBusinessId(id);
    await loadVerification(id);
  };

  const handlePickDocument = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload a document.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setDocUri(asset.uri);
      setDocMime(asset.mimeType ?? 'image/jpeg');
    }
  };

  // Same BR-number regex as the web page
  const validateBRNumber = (): boolean => {
    const pvtRegex = /^PV\d{8}$/;
    const localRegex = /^\d+\/\d{4}\/\w+$/;

    if (businessType === 'pvt_ltd' && !pvtRegex.test(brNumber.trim())) {
      Alert.alert('Invalid BR Number', 'Private Limited format: PV00212345');
      return false;
    }
    if (businessType === 'local_business' && !localRegex.test(brNumber.trim())) {
      Alert.alert('Invalid BR Number', 'Local Business format: Number/Year/Code\ne.g. 123/2020/ABC');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!docUri) {
      Alert.alert('Document required', 'Please upload your BR certificate.');
      return;
    }
    if (!brNumber.trim()) {
      Alert.alert('BR Number required', 'Please enter your Business Registration Number.');
      return;
    }
    if (!validateBRNumber()) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image to verification-docs bucket — same bucket as web
      const ext = docUri.split('.').pop() ?? 'jpg';
      const fileName = `${selectedBusinessId}-${user.id}-${Date.now()}.${ext}`;

      const response = await fetch(docUri);
      const blob = await response.blob();

      const { error: uploadErr } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, blob, { contentType: docMime, upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(fileName);

      // Insert into verifications table — same columns as web
      const { error: verErr } = await supabase
        .from('verifications')
        .insert({
          business_id: selectedBusinessId,
          status: 'pending',
          br_document_url: publicUrl,
          business_type: businessType,
          br_number: brNumber.trim(),
          tin_number: tinNumber.trim() || null,
          svat_number: svatNumber.trim() || null,
        });

      if (verErr) throw verErr;

      // Also update profile verification_status — same as web
      await supabase
        .from('profiles')
        .update({ verification_status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', user.id);

      Alert.alert(
        'Submitted!',
        'Your request is pending admin approval. We will notify you once reviewed.',
        [{ text: 'OK', onPress: fetchData }]
      );
      setDocUri(null);
    } catch (err: any) {
      console.error('handleSubmit error:', err);
      Alert.alert('Error', err.message ?? 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Derived state ────────────────────────────────────────────
  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);
  const displayStatus = verification?.status ?? selectedBusiness?.verification_status ?? 'none';
  const isVerified = displayStatus === 'approved' || selectedBusiness?.is_verified === true;
  const isPending = displayStatus === 'pending';
  const isRejected = displayStatus === 'rejected';
  const canEdit = !isVerified && !isPending;

  const statusMeta = {
    approved: { label: 'Verified', color: '#10b981', Icon: CheckCircle, bg: '#10b98115' },
    pending:  { label: 'Under Review', color: '#f59e0b', Icon: Clock, bg: '#f59e0b15' },
    rejected: { label: 'Rejected', color: '#ef4444', Icon: AlertTriangle, bg: '#ef444415' },
    none:     { label: 'Not Submitted', color: colors.text.tertiary, Icon: ShieldCheck, bg: colors.input.background },
  };
  const meta = statusMeta[displayStatus as keyof typeof statusMeta] ?? statusMeta.none;

  // ─── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand.blue} />
          <Text style={{ marginTop: 16, color: colors.text.secondary, fontFamily: 'Outfit' }}>
            Loading verification info…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── No businesses ────────────────────────────────────────────
  if (businesses.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Business Verification" colors={colors} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Building2 size={64} color={colors.text.tertiary} />
          <Text style={{ fontSize: 20, fontFamily: 'Outfit', marginTop: 24, color: colors.text.primary, textAlign: 'center' }}>
            No Businesses Found
          </Text>
          <Text style={{ fontSize: 14, fontFamily: 'Outfit', marginTop: 8, color: colors.text.secondary, textAlign: 'center' }}>
            Register a business first, then come back to get verified.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Business Verification" subtitle="Get verified to unlock all features" colors={colors} />

      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">

        {/* ── Status Banner ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', padding: 16,
          borderRadius: 16, marginBottom: 24,
          backgroundColor: meta.bg,
          borderWidth: 1, borderColor: meta.color + '40',
        }}>
          <meta.Icon size={20} color={meta.color} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 15, color: meta.color }}>
              {meta.label}
            </Text>
            {displayStatus === 'pending' && (
              <Text style={{ fontFamily: 'Outfit', fontSize: 13, color: colors.text.secondary, marginTop: 4 }}>
                Our team will review your documents within 24–48 hours.
              </Text>
            )}
            {displayStatus === 'approved' && (
              <Text style={{ fontFamily: 'Outfit', fontSize: 13, color: colors.text.secondary, marginTop: 4 }}>
                Your business is verified. You now have access to all vendor features.
              </Text>
            )}
            {displayStatus === 'rejected' && (
              <Text style={{ fontFamily: 'Outfit', fontSize: 13, color: colors.text.secondary, marginTop: 4 }}>
                {verification?.rejection_reason ?? 'Please resubmit with correct documents.'}
              </Text>
            )}
          </View>
        </View>

        {/* ── Business Selector ── */}
        {businesses.length > 1 && (
          <View style={{ marginBottom: 20 }}>
            <Label text="SELECT BUSINESS" colors={colors} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              {businesses.map(biz => {
                const active = biz.id === selectedBusinessId;
                return (
                  <TouchableOpacity
                    key={biz.id}
                    onPress={() => handleSelectBusiness(biz.id)}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      marginHorizontal: 4, paddingHorizontal: 16, paddingVertical: 12,
                      borderRadius: 12, borderWidth: 1,
                      backgroundColor: active ? colors.brand.blue : colors.surface,
                      borderColor: active ? colors.brand.blue : colors.border,
                    }}
                  >
                    {biz.is_verified && (
                      <CheckCircle size={14} color={active ? '#fff' : '#10b981'} fill={active ? '#fff' : '#10b981'} />
                    )}
                    <Text style={{
                      marginLeft: biz.is_verified ? 6 : 0,
                      fontFamily: 'Outfit', fontSize: 14,
                      color: active ? '#fff' : colors.text.primary,
                    }}>
                      {biz.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Business Type ── */}
        <View style={{ marginBottom: 20 }}>
          <Label text="BUSINESS TYPE *" colors={colors} />
          <View style={{ flexDirection: 'row', borderRadius: 14, padding: 4, backgroundColor: colors.input.background }}>
            {(['pvt_ltd', 'local_business'] as const).map(type => {
              const active = businessType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => canEdit && setBusinessType(type)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10,
                    backgroundColor: active ? colors.brand.blue : 'transparent',
                  }}
                >
                  <Text style={{
                    textAlign: 'center', fontFamily: 'Outfit', fontWeight: '700', fontSize: 14,
                    color: active ? '#fff' : colors.text.secondary,
                  }}>
                    {type === 'pvt_ltd' ? 'Private Ltd' : 'Local Business'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── BR Number ── */}
        <View style={{ marginBottom: 16 }}>
          <Label text="BUSINESS REGISTRATION NUMBER *" colors={colors} />
          <TextInput
            value={brNumber}
            onChangeText={setBrNumber}
            editable={canEdit}
            placeholder={businessType === 'pvt_ltd' ? 'PV00212345' : '123/2020/ABC'}
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="characters"
            style={{
              paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
              fontFamily: 'Outfit', fontSize: 15, color: colors.text.primary,
              backgroundColor: colors.input.background, borderWidth: 1, borderColor: colors.border,
            }}
          />
          <Text style={{ fontFamily: 'Outfit', fontSize: 11, marginTop: 4, color: colors.text.tertiary }}>
            {businessType === 'pvt_ltd' ? 'Format: PV followed by 8 digits (e.g. PV00212345)' : 'Format: Number/Year/Code (e.g. 123/2020/ABC)'}
          </Text>
        </View>

        {/* ── TIN Number ── */}
        <View style={{ marginBottom: 16 }}>
          <Label text="TIN NUMBER (OPTIONAL)" colors={colors} />
          <TextInput
            value={tinNumber}
            onChangeText={setTinNumber}
            editable={canEdit}
            placeholder="Tax Identification Number"
            placeholderTextColor={colors.text.tertiary}
            style={{
              paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
              fontFamily: 'Outfit', fontSize: 15, color: colors.text.primary,
              backgroundColor: colors.input.background, borderWidth: 1, borderColor: colors.border,
            }}
          />
        </View>

        {/* ── SVAT Number ── */}
        <View style={{ marginBottom: 24 }}>
          <Label text="SVAT NUMBER (OPTIONAL)" colors={colors} />
          <TextInput
            value={svatNumber}
            onChangeText={setSvatNumber}
            editable={canEdit}
            placeholder="Service VAT Number"
            placeholderTextColor={colors.text.tertiary}
            style={{
              paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
              fontFamily: 'Outfit', fontSize: 15, color: colors.text.primary,
              backgroundColor: colors.input.background, borderWidth: 1, borderColor: colors.border,
            }}
          />
        </View>

        {/* ── Document Upload ── */}
        <View style={{ marginBottom: 24 }}>
          <Label text="BR CERTIFICATE (PHOTO) *" colors={colors} />
          <TouchableOpacity
            onPress={handlePickDocument}
            disabled={!canEdit}
            style={{
              borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
              borderColor: docUri ? colors.brand.blue : colors.border,
              backgroundColor: colors.input.background,
              overflow: 'hidden',
            }}
          >
            {docUri ? (
              <View>
                <Image source={{ uri: docUri }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                {canEdit && (
                  <View style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: colors.brand.blue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: '#fff', fontFamily: 'Outfit', fontSize: 12, fontWeight: '700' }}>Change</Text>
                  </View>
                )}
              </View>
            ) : verification?.br_document_url && (displayStatus === 'pending' || displayStatus === 'approved') ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <FileText size={36} color={colors.brand.blue} />
                <Text style={{ fontFamily: 'Outfit', fontSize: 13, color: colors.text.primary, marginTop: 10 }}>
                  Document already submitted
                </Text>
                {canEdit && (
                  <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>
                    Tap to replace
                  </Text>
                )}
              </View>
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Upload size={36} color={colors.text.tertiary} />
                <Text style={{ fontFamily: 'Outfit', fontSize: 14, color: colors.text.secondary, marginTop: 12 }}>
                  Tap to upload BR certificate photo
                </Text>
                <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>
                  JPEG or PNG · Max 10 MB
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Info Box ── */}
        <View style={{
          padding: 16, borderRadius: 14, marginBottom: 28,
          backgroundColor: colors.brand.blue + '12',
          borderWidth: 1, borderColor: colors.brand.blue + '30',
        }}>
          <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 13, color: colors.text.primary, marginBottom: 6 }}>
            Required documents
          </Text>
          {[
            'Clear photo of your Business Registration Certificate',
            'Document must be valid and not expired',
            'Admin will review within 24–48 hours',
          ].map(line => (
            <Text key={line} style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.secondary, marginTop: 3 }}>
              • {line}
            </Text>
          ))}
        </View>

        {/* ── Submit / Status Button ── */}
        {isRejected ? (
          // Rejected — show "Resubmit" and clear form so user can try again
          <TouchableOpacity
            onPress={() => {
              setVerification(null);
              setBrNumber('');
              setTinNumber('');
              setSvatNumber('');
              setDocUri(null);
            }}
            style={{
              paddingVertical: 16, borderRadius: 14, borderWidth: 1.5,
              borderColor: colors.brand.blue, backgroundColor: colors.brand.blue + '15',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <RefreshCw size={18} color={colors.brand.blue} />
            <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 16, color: colors.brand.blue, marginLeft: 8 }}>
              Resubmit Verification
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || isVerified || isPending}
            style={{
              paddingVertical: 16, borderRadius: 14,
              backgroundColor: isVerified || isPending ? colors.text.tertiary : colors.brand.blue,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 16, color: '#fff', marginLeft: 10 }}>
                  Uploading…
                </Text>
              </>
            ) : (
              <>
                <ShieldCheck size={20} color="#fff" />
                <Text style={{ fontFamily: 'Outfit', fontWeight: '700', fontSize: 16, color: '#fff', marginLeft: 10 }}>
                  {isVerified ? 'Already Verified' : isPending ? 'Under Review' : 'Submit for Verification'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Small sub-components ─────────────────────────────────────────────────────

const Header = ({
  title, subtitle, colors,
}: {
  title: string; subtitle?: string; colors: any;
}) => {
  const navigation = useNavigation();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 14, padding: 4 }}>
        <ArrowLeft size={22} color={colors.text.primary} />
      </TouchableOpacity>
      <View>
        <Text style={{ fontFamily: 'Outfit', fontSize: 20, color: colors.text.primary }}>{title}</Text>
        {subtitle && (
          <Text style={{ fontFamily: 'Outfit', fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

const Label = ({ text, colors }: { text: string; colors: any }) => (
  <Text style={{
    fontFamily: 'Outfit', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
    color: colors.text.tertiary, marginBottom: 8,
  }}>
    {text}
  </Text>
);
