import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, Phone, MessageSquare, TrendingUp, ChevronDown } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { Colors } from '../../theme/colors';
import { SimpleLineChart } from '../../components/SimpleLineChart';

interface AnalyticsData {
  date: string;
  views: number;
  calls: number;
  leads: number;
}

interface Stats {
  views: number;
  calls: number;
  reviews: number;
  leads: number;
}

export const VendorAnalyticsScreen = () => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [stats, setStats] = useState<Stats>({
    views: 0,
    calls: 0,
    reviews: 0,
    leads: 0
  });
  const [chartData, setChartData] = useState<AnalyticsData[]>([]);
  const [businessIds, setBusinessIds] = useState<string[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch businesses owned by the vendor
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id);

      if (!businessData || businessData.length === 0) {
        setLoading(false);
        return;
      }

      const ids = businessData.map(b => b.id);
      setBusinessIds(ids);

      // Fetch analytics data
      const days = timeRange === '7d' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs } = await supabase
        .from('analytics_logs')
        .select('*')
        .in('business_id', ids)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Fetch reviews count
      const { count: reviewsCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .in('business_id', ids);

      // Process logs into daily buckets
      const dailyBuckets: Record<string, AnalyticsData> = {};

      // Initialize buckets for all days in range
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyBuckets[dateStr] = { date: dateStr, views: 0, calls: 0, leads: 0 };
      }

      let totalViews = 0;
      let totalCalls = 0;
      let totalLeads = 0;

      logs?.forEach(log => {
        const dateStr = log.created_at.split('T')[0];
        if (dailyBuckets[dateStr]) {
          if (log.event_type === 'view') {
            dailyBuckets[dateStr].views++;
            totalViews++;
          }
          if (log.event_type === 'call_click') {
            dailyBuckets[dateStr].calls++;
            totalCalls++;
          }
          if (log.event_type === 'lead_form_submit') {
            dailyBuckets[dateStr].leads++;
            totalLeads++;
          }
        }
      });

      const chartDataArray = Object.values(dailyBuckets)
        .sort((a, b) => a.date.localeCompare(b.date));

      setChartData(chartDataArray);
      setStats({
        views: totalViews,
        calls: totalCalls,
        reviews: reviewsCount || 0,
        leads: totalLeads
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };


  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand.blue} />
          <Text className="mt-4 text-base font-outfit" style={{ color: colors.text.secondary }}>
            Loading analytics...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (businessIds.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="px-6 py-4 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-2xl font-outfit" style={{ color: colors.text.primary }}>
            Analytics
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <TrendingUp size={64} color={colors.text.tertiary} />
          <Text className="text-xl font-outfit mt-4 text-center" style={{ color: colors.text.primary }}>
            No Businesses Yet
          </Text>
          <Text className="text-sm font-outfit mt-2 text-center" style={{ color: colors.text.secondary }}>
            Register your first business to start tracking analytics
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="px-6 py-4 border-b" style={{ borderBottomColor: colors.border }}>
        <Text className="text-2xl font-outfit" style={{ color: colors.text.primary }}>
          Analytics
        </Text>
        <Text className="text-sm font-outfit mt-1" style={{ color: colors.text.secondary }}>
          Track your business performance
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.blue}
          />
        }
      >
        {/* Stats Cards */}
        <View className="px-6 py-4">
          <View className="flex-row flex-wrap justify-between">
            {/* Views */}
            <View
              className="rounded-xl p-4 mb-4 border shadow-sm"
              style={{
                width: '48%',
                backgroundColor: colors.surface,
                borderColor: colors.border
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Eye size={20} color={colors.brand.blue} />
                <View className="rounded-full px-2 py-1" style={{ backgroundColor: `${colors.brand.blue}15` }}>
                  <Text className="text-[10px] font-outfit" style={{ color: colors.brand.blue }}>
                    {timeRange === '7d' ? '7 days' : '30 days'}
                  </Text>
                </View>
              </View>
              <Text className="text-2xl font-outfit mb-1" style={{ color: colors.text.primary }}>
                {stats.views.toLocaleString()}
              </Text>
              <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                Profile Views
              </Text>
            </View>

            {/* Calls */}
            <View
              className="rounded-xl p-4 mb-4 border shadow-sm"
              style={{
                width: '48%',
                backgroundColor: colors.surface,
                borderColor: colors.border
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Phone size={20} color="#10b981" />
                <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#10b98115' }}>
                  <Text className="text-[10px] font-outfit" style={{ color: '#10b981' }}>
                    {timeRange === '7d' ? '7 days' : '30 days'}
                  </Text>
                </View>
              </View>
              <Text className="text-2xl font-outfit mb-1" style={{ color: colors.text.primary }}>
                {stats.calls.toLocaleString()}
              </Text>
              <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                Call Clicks
              </Text>
            </View>

            {/* Leads */}
            <View
              className="rounded-xl p-4 mb-4 border shadow-sm"
              style={{
                width: '48%',
                backgroundColor: colors.surface,
                borderColor: colors.border
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <MessageSquare size={20} color="#8b5cf6" />
                <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#8b5cf615' }}>
                  <Text className="text-[10px] font-outfit" style={{ color: '#8b5cf6' }}>
                    {timeRange === '7d' ? '7 days' : '30 days'}
                  </Text>
                </View>
              </View>
              <Text className="text-2xl font-outfit mb-1" style={{ color: colors.text.primary }}>
                {stats.leads.toLocaleString()}
              </Text>
              <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                Leads Generated
              </Text>
            </View>

            {/* Reviews */}
            <View
              className="rounded-xl p-4 mb-4 border shadow-sm"
              style={{
                width: '48%',
                backgroundColor: colors.surface,
                borderColor: colors.border
              }}
            >
              <View className="flex-row items-center justify-between mb-2">
                <TrendingUp size={20} color="#f59e0b" />
                <View className="rounded-full px-2 py-1" style={{ backgroundColor: '#f59e0b15' }}>
                  <Text className="text-[10px] font-outfit" style={{ color: '#f59e0b' }}>
                    All time
                  </Text>
                </View>
              </View>
              <Text className="text-2xl font-outfit mb-1" style={{ color: colors.text.primary }}>
                {stats.reviews.toLocaleString()}
              </Text>
              <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                Total Reviews
              </Text>
            </View>
          </View>
        </View>

        {/* Time Range Selector */}
        <View className="px-6 py-2">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-outfit" style={{ color: colors.text.primary }}>
              Performance Trends
            </Text>
            <View className="flex-row rounded-lg p-1" style={{ backgroundColor: colors.input.background }}>
              <TouchableOpacity
                onPress={() => setTimeRange('7d')}
                className="px-4 py-2 rounded-md"
                style={{
                  backgroundColor: timeRange === '7d' ? colors.brand.blue : 'transparent'
                }}
              >
                <Text
                  className="text-xs font-outfit"
                  style={{
                    color: timeRange === '7d' ? '#ffffff' : colors.text.secondary
                  }}
                >
                  7 Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTimeRange('30d')}
                className="px-4 py-2 rounded-md"
                style={{
                  backgroundColor: timeRange === '30d' ? colors.brand.blue : 'transparent'
                }}
              >
                <Text
                  className="text-xs font-outfit"
                  style={{
                    color: timeRange === '30d' ? '#ffffff' : colors.text.secondary
                  }}
                >
                  30 Days
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View className="px-6 pb-6">
          <View className="rounded-xl overflow-hidden border" style={{ borderColor: colors.border }}>
            {chartData.length > 0 ? (
              <SimpleLineChart data={chartData} colors={colors} />
            ) : (
              <View className="h-[220px] items-center justify-center">
                <Text className="text-sm font-outfit" style={{ color: colors.text.tertiary }}>
                  No data available for this period
                </Text>
              </View>
            )}
          </View>

          {/* Legend */}
          <View className="flex-row items-center justify-center mt-4 space-x-4">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#2563eb' }} />
              <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                Views
              </Text>
            </View>
            <View className="flex-row items-center ml-4">
              <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#10b981' }} />
              <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                Calls
              </Text>
            </View>
            <View className="flex-row items-center ml-4">
              <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#8b5cf6' }} />
              <Text className="text-xs font-outfit" style={{ color: colors.text.secondary }}>
                Leads
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
