import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Flashlight, FlashlightOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export const QRScannerScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Check if it's a business ID or UUID (direct format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(data)) {
        // Direct business ID scan
        const { data: business, error } = await supabase
          .from('businesses')
          .select('id, slug, name')
          .eq('id', data)
          .single();

        if (error || !business) {
          Alert.alert('Business Not Found', 'This QR code does not link to a valid business.', [
            { text: 'OK', onPress: () => setTimeout(() => setScanned(false), 2000) }
          ]);
          return;
        }

        // Navigate directly to business details
        navigation.goBack();
        setTimeout(() => {
          // @ts-ignore
          navigation.navigate('Home', {
            screen: 'BusinessDetails',
            params: {
              businessId: business.id,
              businessSlug: business.slug
            }
          });
        }, 100);
        return;
      }

      // Check if it's a business URL
      if (data.includes('slbusinessindex.com/business/') || data.includes('slbi://business/')) {
        // Extract business ID or slug
        const match = data.match(/business\/([^/?]+)/);
        if (match) {
          const businessSlug = match[1];

          // Try to fetch business
          const { data: business, error } = await supabase
            .from('businesses')
            .select('id, slug, name')
            .or(`slug.eq.${businessSlug},id.eq.${businessSlug}`)
            .single();

          if (error || !business) {
            Alert.alert('Business Not Found', 'This QR code does not link to a valid business.', [
              { text: 'OK', onPress: () => setTimeout(() => setScanned(false), 2000) }
            ]);
            return;
          }

          // Navigate directly to business details
          navigation.goBack();
          setTimeout(() => {
            // @ts-ignore
            navigation.navigate('Home', {
              screen: 'BusinessDetails',
              params: {
                businessId: business.id,
                businessSlug: business.slug
              }
            });
          }, 100);
        }
      } else if (data.startsWith('http://') || data.startsWith('https://')) {
        // Generic URL - ask user
        Alert.alert(
          'Open URL',
          data,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setTimeout(() => setScanned(false), 500) },
            { text: 'Open', onPress: () => {
              Linking.openURL(data);
              setTimeout(() => setScanned(false), 500);
            }}
          ]
        );
      } else {
        // Unknown QR code - show data
        Alert.alert(
          'QR Code Scanned',
          `Data: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`,
          [{ text: 'OK', onPress: () => setTimeout(() => setScanned(false), 500) }]
        );
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', 'Failed to process QR code', [
        { text: 'OK', onPress: () => setTimeout(() => setScanned(false), 2000) }
      ]);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontFamily: 'Outfit' }}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontFamily: 'Outfit', marginBottom: 16 }}>
          Camera permission is required to scan QR codes
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{ backgroundColor: colors.brand.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Outfit' }}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          style={{ backgroundColor: '#374151', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Outfit' }}>Open Settings</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* Overlay */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 999 }}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, fontFamily: 'Outfit' }}>Scan QR Code</Text>
          <TouchableOpacity
            onPress={() => setFlashOn(!flashOn)}
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 999 }}
          >
            {flashOn ? (
              <FlashlightOff size={24} color="white" />
            ) : (
              <Flashlight size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {/* Scan Area */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: SCAN_AREA_SIZE,
              height: SCAN_AREA_SIZE,
              borderWidth: 2,
              borderColor: 'white',
              borderRadius: 20,
              backgroundColor: 'transparent',
            }}
          >
            {/* Corner Brackets */}
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>

          <Text style={{ color: 'white', textAlign: 'center', marginTop: 32, paddingHorizontal: 24, fontFamily: 'Outfit' }}>
            Align QR code within the frame
          </Text>

          {scanned && (
            <View style={{ marginTop: 16, backgroundColor: colors.brand.gold, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 999 }}>
              <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Outfit' }}>Processing...</Text>
            </View>
          )}
        </View>

        {/* Bottom Instructions */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 16, borderRadius: 16 }}>
            <Text style={{ color: 'white', fontSize: 14, textAlign: 'center', fontFamily: 'Outfit' }}>
              Scan a business QR code to view details instantly
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#dfb85d',
    borderTopLeftRadius: 20,
  },
  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#dfb85d',
    borderTopRightRadius: 20,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#dfb85d',
    borderBottomLeftRadius: 20,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#dfb85d',
    borderBottomRightRadius: 20,
  },
});
