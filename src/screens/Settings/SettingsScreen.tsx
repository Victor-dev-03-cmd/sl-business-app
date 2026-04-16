import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Settings, Bell, Shield, HelpCircle, ChevronRight, Globe, LayoutDashboard } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';

export const SettingsScreen = ({ session }: { session: Session | null }) => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchUserRole();
    }
  }, [session]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session?.user.id)
        .single();
      
      if (data) {
        setRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false} className="px-6">
        <View className="pt-8 pb-10 items-center">
          <View className="relative">
            <View className="w-24 h-24 bg-brand-dark rounded-[32px] items-center justify-center shadow-lg shadow-brand-dark/20 mb-4 overflow-hidden">
               <Text className="text-white text-3xl font-bold font-outfit">
                 {session?.user?.email?.charAt(0).toUpperCase()}
               </Text>
            </View>
            <TouchableOpacity className="absolute bottom-4 -right-2 bg-brand-blue p-2.5 rounded-2xl border-2 border-white">
              <User size={14} color="white" fill="white" />
            </TouchableOpacity>
          </View>
          <Text className="text-2xl font-bold text-brand-dark font-outfit mt-2">{session?.user?.email}</Text>
          <View className="bg-brand-gold/10 px-3 py-1 rounded-full mt-2">
            <Text className="text-brand-gold text-[10px] font-bold font-outfit uppercase tracking-widest">
              {role ? `${role.charAt(0).toUpperCase() + role.slice(1)} Account` : 'Premium Member'}
            </Text>
          </View>
        </View>

        {/* Dashboard Section for Admin/Vendor */}
        {(role === 'admin' || role === 'ceo' || role === 'vendor') && (
          <View className="bg-white rounded-[32px] p-6 mb-8 shadow-sm border border-gray-100">
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest font-outfit mb-6 ml-2">Management</Text>
            <TouchableOpacity className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="bg-brand-blue/10 p-3 rounded-2xl mr-4">
                  <LayoutDashboard size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text className="font-bold text-gray-900 font-outfit">
                    {role === 'vendor' ? 'Vendor Dashboard' : 'Admin Dashboard'}
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-outfit">Manage your business & listings</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-white rounded-[32px] p-6 mb-8 shadow-sm border border-gray-100">
           <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest font-outfit mb-6 ml-2">App Settings</Text>
           
           {[
             { name: 'Notifications', icon: Bell, color: '#3b82f6', value: true, type: 'toggle' },
             { name: 'Account Info', icon: User, color: '#053765', type: 'link' },
             { name: 'Language', icon: Globe, color: '#b4863b', type: 'link', rightText: 'English' },
             { name: 'Privacy & Security', icon: Shield, color: '#10b981', type: 'link' },
           ].map((item, idx) => (
             <View key={idx} className={`flex-row items-center justify-between ${idx === 3 ? '' : 'mb-8'}`}>
               <View className="flex-row items-center">
                 <View className="bg-gray-50 p-3 rounded-2xl mr-4">
                   <item.icon size={20} color={item.color} />
                 </View>
                 <Text className="font-bold text-gray-900 font-outfit">{item.name}</Text>
               </View>
               {item.type === 'toggle' ? (
                 <Switch value={!!item.value} />
               ) : (
                 <View className="flex-row items-center">
                    {!!item.rightText && <Text className="text-gray-400 text-xs mr-2 font-outfit">{item.rightText}</Text>}
                    <ChevronRight size={16} color="#94a3b8" />
                 </View>
               )}
             </View>
           ))}
        </View>

        <View className="bg-white rounded-[32px] p-6 mb-8 shadow-sm border border-gray-100">
           <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest font-outfit mb-6 ml-2">Support</Text>
           
           {[
             { name: 'Help Center', icon: HelpCircle, color: '#053765' },
             { name: 'Settings', icon: Settings, color: '#053765' },
           ].map((item, idx) => (
             <TouchableOpacity key={idx} className={`flex-row items-center justify-between ${idx === 1 ? '' : 'mb-8'}`}>
               <View className="flex-row items-center">
                 <View className="bg-gray-50 p-3 rounded-2xl mr-4">
                   <item.icon size={20} color={item.color} />
                 </View>
                 <Text className="font-bold text-gray-900 font-outfit">{item.name}</Text>
               </View>
               <ChevronRight size={16} color="#94a3b8" />
             </TouchableOpacity>
           ))}
        </View>

        <TouchableOpacity 
          onPress={handleLogout}
          className="bg-brand-dark/5 rounded-[32px] py-6 flex-row items-center justify-center mb-10"
        >
           <LogOut size={20} color="#053765" />
           <Text className="text-brand-dark font-bold font-outfit ml-3">Log Out of SL Business Index</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
