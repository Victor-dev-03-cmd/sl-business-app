import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  Check,
  Info,
  AlertTriangle,
  X,
  Clock,
  CheckCheck
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  created_at: string;
  is_read: boolean;
  user_id: string;
}

export const NotificationsScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [userId]);

  const initializeUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        Alert.alert('Sign In Required', 'Please sign in to view notifications');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!userId) return;

    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        Alert.alert('Success', 'All notifications marked as read');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'success':
        return { Icon: Check, bgColor: '#dcfce7', iconColor: '#10b981' };
      case 'error':
        return { Icon: X, bgColor: '#fee2e2', iconColor: '#ef4444' };
      case 'warning':
        return { Icon: AlertTriangle, bgColor: '#fef3c7', iconColor: '#f59e0b' };
      default:
        return { Icon: Info, bgColor: '#dbeafe', iconColor: '#3b82f6' };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 8, backgroundColor: colors.input.background, borderRadius: 999, marginRight: 12 }}
            >
              <ArrowLeft size={20} color={colors.brand.dark} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary, fontFamily: 'Outfit' }}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Text style={{ fontSize: 12, color: colors.text.secondary, fontFamily: 'Outfit', marginTop: 2 }}>
                  {unreadCount} unread
                </Text>
              )}
            </View>
          </View>
          <View style={{ backgroundColor: colors.brand.blue, padding: 8, borderRadius: 999 }}>
            <Bell size={20} color="white" />
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={{ backgroundColor: colors.brand.gold + '1A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCheck size={16} color={colors.brand.gold} />
              <Text style={{ color: colors.brand.gold, fontSize: 12, fontWeight: 'bold', marginLeft: 8, fontFamily: 'Outfit' }}>
                Mark all as read
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
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
        {loading ? (
          // Loading skeleton
          [...Array(5)].map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 40, height: 40, backgroundColor: colors.input.background, borderRadius: 8, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ height: 16, backgroundColor: colors.input.background, borderRadius: 4, width: '75%', marginBottom: 8 }} />
                  <View style={{ height: 12, backgroundColor: colors.input.background, borderRadius: 4, width: '100%' }} />
                </View>
              </View>
            </View>
          ))
        ) : notifications.length > 0 ? (
          notifications.map((notif) => {
            const { Icon, bgColor, iconColor } = getIconAndColor(notif.type);
            return (
              <TouchableOpacity
                key={notif.id}
                onPress={() => markAsRead(notif.id)}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: !notif.is_read ? colors.brand.gold : colors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ width: 40, height: 40, backgroundColor: bgColor, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Icon size={20} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: colors.text.primary, fontWeight: 'bold', fontSize: 14, flex: 1, fontFamily: 'Outfit' }}>
                        {notif.title}
                      </Text>
                      {!notif.is_read && (
                        <View style={{ width: 8, height: 8, backgroundColor: colors.brand.gold, borderRadius: 999, marginLeft: 8, marginTop: 4 }} />
                      )}
                    </View>
                    <Text style={{ color: colors.text.secondary, fontSize: 12, fontFamily: 'Outfit', lineHeight: 18 }}>
                      {notif.message}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Clock size={10} color={colors.text.tertiary} />
                      <Text style={{ color: colors.text.tertiary, fontSize: 10, marginLeft: 4, fontFamily: 'Outfit' }}>
                        {formatTime(notif.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
            <Bell size={64} color={colors.border} />
            <Text style={{ color: colors.text.tertiary, fontSize: 18, fontFamily: 'Outfit', marginTop: 16 }}>
              No notifications yet
            </Text>
            <Text style={{ color: colors.text.tertiary, fontSize: 14, fontFamily: 'Outfit', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
              You'll receive notifications about your businesses and activities here
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
