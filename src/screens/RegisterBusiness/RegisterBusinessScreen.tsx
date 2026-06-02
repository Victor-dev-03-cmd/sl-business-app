import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Upload,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Camera,
  Image as ImageIcon
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';

export const RegisterBusinessScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const navigation = useNavigation();

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [address, setAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Registration type
  const [registrationType, setRegistrationType] = useState<'registered' | 'unregistered'>('registered');
  const [brNumber, setBrNumber] = useState('');
  const [nicNumber, setNicNumber] = useState('');

  // Images
  const [logo, setLogo] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [existingBusiness, setExistingBusiness] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    checkAuth();
    checkExistingBusiness();
    fetchCategories();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      // Pre-fill owner name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (profile) {
        setOwnerName(profile.full_name || '');
        if (!email) setEmail(profile.email || '');
      }
    }
  };

  const checkExistingBusiness = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('businesses')
      .select('id, status, name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setExistingBusiness(data);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(data.map((cat) => cat.name));
      } else {
        // Fallback categories if database is empty
        setCategories([
          'Food & Dining',
          'Shopping & Retail',
          'Health & Medical',
          'Professional Services',
          'Home Appliances & Services',
          'Automotive',
          'Entertainment',
          'Education',
          'Technology',
          'Beauty & Health',
          'Travel & Tourism',
          'Others'
        ]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback categories on error
      setCategories([
        'Food & Dining',
        'Shopping & Retail',
        'Health & Medical',
        'Professional Services',
        'Others'
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Validation functions
  const validateNIC = (nic: string): boolean => {
    const oldNicRegex = /^[5-9][0-9]{8}[vVxX]$/;
    const newNicRegex = /^(19|20)[0-9]{10}$/;
    return oldNicRegex.test(nic) || newNicRegex.test(nic);
  };

  const validateBR = (br: string): boolean => {
    const brRegex = /^(PV|PB|PC|GA|GB|WP|W|CP|C|SP|S|NP|N|EP|E|NW|NC|UVA|U|SG)(\s|\/)?\d+$/i;
    return brRegex.test(br);
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Your device location is turned off. Please enable it:\n\n' +
          '• Android: Settings → Location → Turn ON\n' +
          '• iOS: Settings → Privacy → Location Services → Turn ON\n\n' +
          'Or you can manually enter your business address below.',
          [{ text: 'OK' }]
        );
        setGettingLocation(false);
        return;
      }

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to auto-fill your business address.\n\n' +
          'You can grant permission in app settings, or manually enter the address below.',
          [{ text: 'OK' }]
        );
        setGettingLocation(false);
        return;
      }

      // Show a loading message after 2 seconds
      const timeoutId = setTimeout(() => {
        Alert.alert(
          'Getting Location...',
          'This may take a few moments. Please wait or cancel and enter address manually.',
          [{ text: 'OK' }]
        );
      }, 2000);

      // Try with last known location first (faster)
      let loc;
      try {
        loc = await Location.getLastKnownPositionAsync({
          maxAge: 60000, // Accept location from last 60 seconds
          requiredAccuracy: 100, // Within 100 meters
        });

        if (loc && loc.coords) {
          console.log('Using last known location');
          clearTimeout(timeoutId);
        } else {
          throw new Error('No recent location available');
        }
      } catch (lastKnownError) {
        console.log('Last known location failed, getting fresh location');
        // Get fresh location with timeouts
        try {
          loc = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('High accuracy timeout')), 8000)
            )
          ]) as Location.LocationObject;
          clearTimeout(timeoutId);
        } catch (highAccuracyError) {
          console.log('High accuracy failed, trying balanced:', highAccuracyError);
          try {
            loc = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Balanced accuracy timeout')), 6000)
              )
            ]) as Location.LocationObject;
            clearTimeout(timeoutId);
          } catch (balancedError) {
            console.log('Balanced accuracy failed, trying low:', balancedError);
            try {
              loc = await Promise.race([
                Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Low,
                }),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Low accuracy timeout')), 4000)
                )
              ]) as Location.LocationObject;
              clearTimeout(timeoutId);
            } catch (lowError) {
              clearTimeout(timeoutId);
              throw lowError;
            }
          }
        }
      }

      if (!loc || !loc.coords) {
        throw new Error('Unable to get location coordinates');
      }

      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude
      });

      // Reverse geocode to get address
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });

        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          const streetPart = addr.street || addr.name || '';
          const cityPart = addr.city || addr.subregion || '';

          const shortAddr = [streetPart, cityPart].filter(Boolean).join(', ');
          const fullAddr = [
            streetPart,
            cityPart,
            addr.region || '',
            addr.country || 'Sri Lanka'
          ].filter(Boolean).join(', ');

          setAddress(shortAddr || `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`);
          setDetailedAddress(fullAddr || shortAddr);
        } else {
          // If reverse geocoding fails, use coordinates
          const coordsStr = `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`;
          setAddress(coordsStr);
          setDetailedAddress(coordsStr);
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding failed:', geocodeError);
        // Use coordinates as fallback
        const coordsStr = `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`;
        setAddress(coordsStr);
        setDetailedAddress(coordsStr);
      }

      Alert.alert('Success', 'Location captured successfully! You can edit the address if needed.');
    } catch (error: any) {
      console.error('Error getting location:', error);

      let errorTitle = 'Unable to Get Location';
      let errorMessage = '';

      if (error.message?.includes('timeout')) {
        errorMessage = 'Location request timed out.\n\n' +
          'Tips:\n' +
          '• Move to an open area (away from buildings)\n' +
          '• Make sure you have good GPS signal\n' +
          '• Or manually enter your address below';
      } else if (error.message?.includes('unavailable')) {
        errorMessage = 'Location is currently unavailable.\n\n' +
          'Please check:\n' +
          '• Location is enabled: Settings → Location → ON\n' +
          '• App has permission: Settings → Apps → Permissions\n\n' +
          'Or manually enter your address below.';
      } else {
        errorMessage = 'Could not determine your location.\n\n' +
          'Are you using an emulator? Emulators often have issues with GPS.\n\n' +
          'Solution: Manually enter your business address in the fields below.';
      }

      Alert.alert(errorTitle, errorMessage, [
        { text: 'OK', style: 'default' }
      ]);
    } finally {
      setGettingLocation(false);
    }
  };

  const pickImage = async (type: 'logo' | 'cover') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'logo') {
          setLogo(result.assets[0].uri);
        } else {
          setCoverImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string, fileName: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const filePath = `${user.id}/${Date.now()}_${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!businessName.trim()) {
      Alert.alert('Required', 'Business Name is required');
      return;
    }

    if (!category) {
      Alert.alert('Required', 'Please select a category');
      return;
    }

    if (!location && !address.trim()) {
      Alert.alert('Required', 'Please set your business location or enter address manually');
      return;
    }

    if (!ownerName.trim()) {
      Alert.alert('Required', 'Owner Name is required');
      return;
    }

    if (!contactNumber.trim()) {
      Alert.alert('Required', 'Contact Number is required');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Required', 'Business Email is required');
      return;
    }

    if (registrationType === 'registered') {
      if (!brNumber.trim()) {
        Alert.alert('Required', 'BR Number is required for registered companies');
        return;
      }
      if (!validateBR(brNumber)) {
        Alert.alert('Invalid', 'Invalid BR Number format (e.g., PV 1234, WP/1234)');
        return;
      }
    }

    if (registrationType === 'unregistered') {
      if (!nicNumber.trim()) {
        Alert.alert('Required', 'NIC Number is required');
        return;
      }
      if (!validateNIC(nicNumber)) {
        Alert.alert('Invalid', 'Invalid Sri Lankan NIC format');
        return;
      }
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to register a business');
        return;
      }

      // Upload images
      let logoUrl = null;
      if (logo) {
        logoUrl = await uploadImage(logo, 'logo.jpg');
      }

      let coverImageUrl = null;
      if (coverImage) {
        coverImageUrl = await uploadImage(coverImage, 'cover.jpg');
      }

      // Prepare business data
      const businessData: any = {
        name: businessName,
        description,
        logo_url: logoUrl,
        image_url: coverImageUrl,
        email,
        owner_name: ownerName,
        phone: contactNumber,
        category,
        website_name: websiteName,
        website_url: websiteUrl,
        working_hours: workingHours,
        is_registered: registrationType === 'registered',
        registration_number: registrationType === 'registered' ? brNumber : nicNumber,
        owner_id: user.id,
        address,
        detailed_address: detailedAddress,
        status: 'pending'
      };

      // Add location data if available
      if (location) {
        businessData.location = `POINT(${location.lng} ${location.lat})`;
        businessData.latitude = location.lat;
        businessData.longitude = location.lng;
      }

      // Insert business
      const { error: insertError } = await supabase.from('businesses').insert([businessData]);

      if (insertError) throw insertError;

      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting business:', error);
      Alert.alert('Error', error.message || 'Failed to submit business');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <AlertCircle size={48} color={colors.text.tertiary} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginTop: 16, fontFamily: 'Outfit' }}>
            Login Required
          </Text>
          <Text style={{ color: colors.text.secondary, marginTop: 8, textAlign: 'center', fontFamily: 'Outfit' }}>
            Please login to register your business
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Account' as never)}
            style={{ marginTop: 24, backgroundColor: colors.brand.blue, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Outfit' }}>Go to Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (existingBusiness && !isSubmitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <CheckCircle size={48} color={colors.success} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginTop: 16, fontFamily: 'Outfit' }}>
            Business Already Registered
          </Text>
          <Text style={{ color: colors.text.secondary, marginTop: 8, textAlign: 'center', fontFamily: 'Outfit' }}>
            {existingBusiness.name}
          </Text>
          <Text style={{ color: colors.text.tertiary, marginTop: 4, textAlign: 'center', fontFamily: 'Outfit', fontSize: 12 }}>
            Status: {existingBusiness.status}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isSubmitted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <CheckCircle size={64} color={colors.success} />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginTop: 24, fontFamily: 'Outfit' }}>
            Submitted Successfully!
          </Text>
          <Text style={{ color: colors.text.secondary, marginTop: 12, textAlign: 'center', fontFamily: 'Outfit' }}>
            Your business has been submitted for review. We'll notify you once it's approved.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home' as never)}
            style={{ marginTop: 32, backgroundColor: colors.brand.blue, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Outfit' }}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Outfit' }}>
              Register Your Business
            </Text>
            <Text style={{ color: colors.text.secondary, marginTop: 8, fontFamily: 'Outfit' }}>
              Fill in the details to list your business on SL Business Index
            </Text>
          </View>

          <View style={{ padding: 24 }}>
            {/* Business Information */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 16, fontFamily: 'Outfit' }}>
                Business Information
              </Text>

              {/* Business Name */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Business Name <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Enter business name"
                  placeholderTextColor={colors.input.placeholder}
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit'
                  }}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your business"
                  placeholderTextColor={colors.input.placeholder}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit',
                    textAlignVertical: 'top'
                  }}
                />
              </View>

              {/* Category */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Category <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCategoryPicker(true)}
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: category ? colors.input.text : colors.input.placeholder, fontFamily: 'Outfit' }}>
                    {category || 'Select category'}
                  </Text>
                  <ChevronDown size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>

              {showCategoryPicker && (
                <View style={{ marginBottom: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, maxHeight: 200 }}>
                  <ScrollView>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryPicker(false);
                        }}
                        style={{
                          padding: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                          backgroundColor: category === cat ? colors.brand.blue + '10' : 'transparent'
                        }}
                      >
                        <Text style={{ color: category === cat ? colors.brand.blue : colors.text.primary, fontFamily: 'Outfit' }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Images */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 16, fontFamily: 'Outfit' }}>
                Images
              </Text>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                {/* Logo */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                    Logo
                  </Text>
                  <TouchableOpacity
                    onPress={() => pickImage('logo')}
                    style={{
                      backgroundColor: colors.input.background,
                      borderWidth: 2,
                      borderColor: colors.input.border,
                      borderStyle: 'dashed',
                      borderRadius: 12,
                      height: 120,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    {logo ? (
                      <Image source={{ uri: logo }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                    ) : (
                      <>
                        <Camera size={32} color={colors.text.tertiary} />
                        <Text style={{ color: colors.text.tertiary, marginTop: 8, fontSize: 12, fontFamily: 'Outfit' }}>Upload Logo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Cover Image */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                    Cover Image
                  </Text>
                  <TouchableOpacity
                    onPress={() => pickImage('cover')}
                    style={{
                      backgroundColor: colors.input.background,
                      borderWidth: 2,
                      borderColor: colors.input.border,
                      borderStyle: 'dashed',
                      borderRadius: 12,
                      height: 120,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    {coverImage ? (
                      <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                    ) : (
                      <>
                        <ImageIcon size={32} color={colors.text.tertiary} />
                        <Text style={{ color: colors.text.tertiary, marginTop: 8, fontSize: 12, fontFamily: 'Outfit' }}>Upload Cover</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Location */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 8, fontFamily: 'Outfit' }}>
                Location <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <Text style={{ color: colors.text.tertiary, marginBottom: 16, fontFamily: 'Outfit', fontSize: 13 }}>
                Click the button to auto-detect or type manually below
              </Text>

              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={gettingLocation}
                style={{
                  backgroundColor: colors.brand.blue,
                  padding: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <MapPin size={20} color="white" />
                    <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 8, fontFamily: 'Outfit' }}>
                      Get Current Location
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {location && (
                <View style={{ backgroundColor: colors.success + '15', padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={20} color={colors.success} />
                  <Text style={{ color: colors.success, marginLeft: 8, fontFamily: 'Outfit', fontSize: 12, flex: 1 }}>
                    Location captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </Text>
                </View>
              )}

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Address {location ? '' : <Text style={{ color: colors.error }}>*</Text>}
                </Text>
                <TextInput
                  value={address}
                  onChangeText={(text) => {
                    setAddress(text);
                    // If user manually enters address, try to geocode it
                    if (text.length > 10 && !location) {
                      // User is typing manually, this is okay
                    }
                  }}
                  placeholder="e.g., 123 Galle Road, Colombo"
                  placeholderTextColor={colors.input.placeholder}
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit'
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Detailed Address
                </Text>
                <TextInput
                  value={detailedAddress}
                  onChangeText={setDetailedAddress}
                  placeholder="Full address with district, province"
                  placeholderTextColor={colors.input.placeholder}
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit',
                    textAlignVertical: 'top'
                  }}
                />
              </View>

              {!location && (
                <View style={{ backgroundColor: colors.brand.blue + '10', padding: 12, borderRadius: 12, marginTop: 8 }}>
                  <Text style={{ color: colors.text.tertiary, fontSize: 12, fontFamily: 'Outfit' }}>
                    💡 Tip: Click "Get Current Location" button or enter your business address manually above. Location coordinates help customers find you on the map.
                  </Text>
                </View>
              )}
            </View>

            {/* Contact Information */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 16, fontFamily: 'Outfit' }}>
                Contact Information
              </Text>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Owner Name <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <TextInput
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Enter owner name"
                  placeholderTextColor={colors.input.placeholder}
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit'
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Contact Number <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <TextInput
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="0771234567"
                  placeholderTextColor={colors.input.placeholder}
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit'
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Business Email <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="business@example.com"
                  placeholderTextColor={colors.input.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit'
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Website Name
                </Text>
                <TextInput
                  value={websiteName}
                  onChangeText={setWebsiteName}
                  placeholder="My Business Website"
                  placeholderTextColor={colors.input.placeholder}
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit'
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Website URL
                </Text>
                <TextInput
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://example.com"
                  placeholderTextColor={colors.input.placeholder}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit'
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                  Working Hours
                </Text>
                <TextInput
                  value={workingHours}
                  onChangeText={setWorkingHours}
                  placeholder="Mon-Fri: 9AM-6PM"
                  placeholderTextColor={colors.input.placeholder}
                  style={{
                    backgroundColor: colors.input.background,
                    padding: 14,
                    borderRadius: 12,
                    color: colors.input.text,
                    borderWidth: 1,
                    borderColor: colors.input.border,
                    fontFamily: 'Outfit'
                  }}
                />
              </View>
            </View>

            {/* Registration Type */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 16, fontFamily: 'Outfit' }}>
                Registration Type <Text style={{ color: colors.error }}>*</Text>
              </Text>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setRegistrationType('registered')}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: registrationType === 'registered' ? colors.brand.blue : colors.border,
                    backgroundColor: registrationType === 'registered' ? colors.brand.blue + '10' : colors.surface
                  }}
                >
                  <Text style={{
                    color: registrationType === 'registered' ? colors.brand.blue : colors.text.primary,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontFamily: 'Outfit'
                  }}>
                    Registered
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRegistrationType('unregistered')}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: registrationType === 'unregistered' ? colors.brand.blue : colors.border,
                    backgroundColor: registrationType === 'unregistered' ? colors.brand.blue + '10' : colors.surface
                  }}
                >
                  <Text style={{
                    color: registrationType === 'unregistered' ? colors.brand.blue : colors.text.primary,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontFamily: 'Outfit'
                  }}>
                    Unregistered
                  </Text>
                </TouchableOpacity>
              </View>

              {registrationType === 'registered' ? (
                <View>
                  <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                    BR Number <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <TextInput
                    value={brNumber}
                    onChangeText={setBrNumber}
                    placeholder="PV 1234 or WP/1234"
                    placeholderTextColor={colors.input.placeholder}
                    autoCapitalize="characters"
                    style={{
                      backgroundColor: colors.input.background,
                      padding: 14,
                      borderRadius: 12,
                      color: colors.input.text,
                      borderWidth: 1,
                      borderColor: colors.input.border,
                      fontFamily: 'Outfit'
                    }}
                  />
                </View>
              ) : (
                <View>
                  <Text style={{ color: colors.text.secondary, marginBottom: 8, fontFamily: 'Outfit', fontSize: 14 }}>
                    NIC Number <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <TextInput
                    value={nicNumber}
                    onChangeText={setNicNumber}
                    placeholder="971234567V or 199712345678"
                    placeholderTextColor={colors.input.placeholder}
                    style={{
                      backgroundColor: colors.input.background,
                      padding: 14,
                      borderRadius: 12,
                      color: colors.input.text,
                      borderWidth: 1,
                      borderColor: colors.input.border,
                      fontFamily: 'Outfit'
                    }}
                  />
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={{
                backgroundColor: colors.brand.blue,
                padding: 18,
                borderRadius: 12,
                alignItems: 'center',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, fontFamily: 'Outfit' }}>
                  Submit for Review
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
