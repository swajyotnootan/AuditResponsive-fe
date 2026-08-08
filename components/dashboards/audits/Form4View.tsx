import { API_BASE_URL } from '@/config/apiConfig';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';

const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const departments = ["HR", "R&D", "Purchase", "Production", "QA/QC", "Maintenance"];

export default function Form4View() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState<any[]>([]);
  const [planStatus, setPlanStatus] = useState('DRAFT');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchPlanData(); }, [selectedYear]);

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/department-plan/${selectedYear}`, { withCredentials: true });
      setPlanData(res.data?.planItems || []);
      setPlanStatus(res.data?.approvalStatus || 'DRAFT');
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const getBadge = () => {
    if (planStatus === 'APPROVED') return { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' };
    if (planStatus === 'PENDING_APPROVAL') return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' };
    return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Draft' };
  };
  const badge = getBadge();

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#2563EB" /></View>;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="mx-4 mt-4 p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm">
          <View className="flex-row items-center justify-between flex-wrap gap-4">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-xl bg-emerald-100 items-center justify-center">
                <Icon name="layers" size={22} color="#059669" />
              </View>
              <View>
                <Text className="text-lg font-bold text-slate-800">Department Audit Plan</Text>
                <Text className="text-xs text-slate-500">Form 4 - Department-wise Planning {selectedYear}</Text>
              </View>
            </View>
            <View className={`px-3 py-1.5 rounded-full ${badge.bg}`}>
              <Text className={`text-xs font-bold ${badge.text}`}>{badge.label}</Text>
            </View>
          </View>
        </View>

        {/* Responsive Table */}
        <View className="mx-4 mt-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[900px]">
              {/* Header */}
              <View className="flex-row bg-slate-50 border-b border-slate-200">
                <Text className="w-40 p-3 font-bold text-xs text-slate-600 uppercase sticky left-0 bg-slate-50 z-10">Department</Text>
                {months.map(m => (
                  <Text key={m} className="w-16 p-3 text-center font-bold text-xs text-slate-600 uppercase">{m}</Text>
                ))}
              </View>
              
              {/* Body */}
              {planData.map((dept, dIdx) => (
                <View key={dIdx} className="flex-row border-b border-slate-100">
                  <Text className="w-40 p-3 text-sm font-bold text-slate-800 sticky left-0 bg-white z-10">{dept.department}</Text>
                  {dept.months.map((month: any, mIdx: number) => {
                    const hasElements = month.selectedElements?.length > 0;
                    const isPlanned = month.status === 'PLANNED';
                    const isCompleted = month.status === 'COMPLETED';
                    
                    return (
                      <TouchableOpacity key={mIdx} className="w-16 p-2 items-center justify-center">
                        <View className={`w-8 h-8 rounded-full items-center justify-center ${isCompleted ? 'bg-green-100' : isPlanned ? 'bg-blue-100' : 'bg-slate-100'}`}>
                          <Text className={`text-[10px] font-bold ${isCompleted ? 'text-green-600' : isPlanned ? 'text-blue-600' : 'text-slate-400'}`}>
                            {isCompleted ? 'C' : isPlanned ? 'P' : '—'}
                          </Text>
                        </View>
                        {hasElements && (
                          <View className="mt-1 px-1.5 py-0.5 bg-purple-100 rounded-full">
                            <Text className="text-[8px] font-bold text-purple-600">{month.selectedElements.length} el</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Actions */}
        <View className="mx-4 mt-6 p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm flex-row justify-end gap-3 flex-wrap">
          <TouchableOpacity className="px-5 py-3 bg-white border border-slate-200 rounded-xl flex-row items-center gap-2">
            <Icon name="save" size={16} color="#475569" />
            <Text className="text-sm font-semibold text-slate-700">Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-5 py-3 bg-emerald-600 rounded-xl flex-row items-center gap-2 shadow-sm">
            <Icon name="send" size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Submit for Approval</Text>
          </TouchableOpacity>
        </View>
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}