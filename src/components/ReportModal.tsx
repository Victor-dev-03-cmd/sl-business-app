import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Flag, AlertTriangle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'news' | 'business';
  targetName?: string;
  userId?: string;
}

const REPORT_REASONS = [
  'Inappropriate Content',
  'Spam or Misleading',
  'Illegal Activities',
  'Harassment',
  'Incorrect Information',
  'Other',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  targetId,
  targetType,
  targetName,
  userId,
}) => {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('Error', 'Please login to submit a report');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.from('reports').insert([
        {
          reporter_id: userId,
          target_id: targetId,
          target_type: targetType,
          target_name: targetName,
          reason,
          description: description.trim() || null,
        },
      ]);

      if (error) throw error;

      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our team will review it shortly.',
        [
          {
            text: 'OK',
            onPress: () => {
              setDescription('');
              setReason(REPORT_REASONS[0]);
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('Error submitting report:', err);
      Alert.alert('Error', err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          {/* Header */}
          <View className="p-6 border-b border-gray-100 flex-row items-center justify-between bg-red-50/30">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center">
                <AlertTriangle size={20} color="#dc2626" />
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-900 font-outfit">
                  Report {targetType === 'business' ? 'Business' : 'Post'}
                </Text>
                <Text className="text-xs text-gray-500 font-outfit">
                  Help us keep the platform safe
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-100"
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
            {/* Target Name */}
            {targetName && (
              <View className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 font-outfit">
                  TARGET
                </Text>
                <Text className="text-sm font-bold text-gray-900 font-outfit">
                  {targetName}
                </Text>
              </View>
            )}

            {/* Reason Selection */}
            <View className="mb-6">
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1 font-outfit">
                Reason for Report
              </Text>
              <View className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setReason(r)}
                    className={`px-4 py-3 rounded-xl border ${
                      reason === r
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold font-outfit ${
                        reason === r ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1 font-outfit">
                Additional Details (Optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Tell us more about the issue..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 font-outfit"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-4 bg-red-600 rounded-2xl flex-row items-center justify-center gap-2 mb-3 ${
                isSubmitting ? 'opacity-50' : ''
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Flag size={18} color="white" />
                  <Text className="text-white font-bold text-[12px] uppercase tracking-widest font-outfit">
                    Submit Report
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onClose}
              className="w-full py-4 items-center justify-center"
            >
              <Text className="text-gray-400 font-bold text-[12px] uppercase tracking-widest font-outfit">
                Cancel
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
