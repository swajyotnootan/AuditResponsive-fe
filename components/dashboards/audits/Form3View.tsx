import { API_BASE_URL } from '@/config/apiConfig';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../context/AuthContext';

const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export default function Form3View() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState<any[]>([]);
  const [planStatus, setPlanStatus] = useState('DRAFT');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchPlanData(); }, [selectedYear]);

  const fetchPlanData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/audit-plan/${selectedYear}`, { withCredentials: true });
      setPlanData(res.data?.planItems || []);
      setPlanStatus(res.data?.approvalStatus || 'DRAFT');
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleStatusChange = (elIdx: number, monthName: string) => {
    const newData = [...planData];
    const mIdx = newData[elIdx].months.findIndex((m: any) => m.month === monthName);
    const curr = newData[elIdx].months[mIdx].status;
    newData[elIdx].months[mIdx].status = curr === '' ? 'PLANNED' : curr === 'PLANNED' ? 'COMPLETED' : '';
    setPlanData(newData);
  };

  const getStatusBadge = () => {
    if (planStatus === 'APPROVED') return { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' };
    if (planStatus === 'PENDING_APPROVAL') return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' };
    return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Draft' };
  };
  const badge = getStatusBadge();

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#2563EB" /></View>;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="mx-4 mt-4 p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm">
          <View className="flex-row items-center justify-between flex-wrap gap-4">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-xl bg-blue-100 items-center justify-center">
                <Icon name="calendar" size={22} color="#2563EB" />
              </View>
              <View>
                <Text className="text-lg font-bold text-slate-800">Annual Audit Plan</Text>
                <Text className="text-xs text-slate-500">Form 3 - Financial Year {selectedYear}</Text>
              </View>
            </View>
            <View className={`px-3 py-1.5 rounded-full ${badge.bg}`}>
              <Text className={`text-xs font-bold ${badge.text}`}>{badge.label}</Text>
            </View>
          </View>
        </View>

        {/* Responsive Table (Horizontal Scroll for Mobile) */}
        <View className="mx-4 mt-6 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm overflow-hidden">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="min-w-[800px]">
              {/* Table Header */}
              <View className="flex-row bg-slate-50 border-b border-slate-200">
                <Text className="w-48 p-3 font-bold text-xs text-slate-600 uppercase">Audit Element</Text>
                {months.map(m => (
                  <Text key={m} className="w-16 p-3 text-center font-bold text-xs text-slate-600 uppercase">{m}</Text>
                ))}
              </View>
              
              {/* Table Body */}
              {planData.map((element, elIdx) => (
                <View key={elIdx} className="flex-row border-b border-slate-100">
                  <Text className="w-48 p-3 text-sm font-medium text-slate-800" numberOfLines={1}>{element.auditElement}</Text>
                  {element.months.map((month: any, mIdx: number) => {
                    const isPlanned = month.status === 'PLANNED';
                    const isCompleted = month.status === 'COMPLETED';
                    return (
                      <TouchableOpacity 
                        key={mIdx} 
                        className="w-16 p-3 items-center justify-center"
                        onPress={() => handleStatusChange(elIdx, month.month)}
                      >
                        <View className={`w-8 h-8 rounded-full items-center justify-center ${isCompleted ? 'bg-green-100' : isPlanned ? 'bg-blue-100' : 'bg-slate-100'}`}>
                          <Text className={`text-xs font-bold ${isCompleted ? 'text-green-600' : isPlanned ? 'text-blue-600' : 'text-slate-400'}`}>
                            {isCompleted ? 'C' : isPlanned ? 'P' : '—'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View className="mx-4 mt-6 p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-sm flex-row justify-end gap-3 flex-wrap">
          <TouchableOpacity className="px-5 py-3 bg-white border border-slate-200 rounded-xl flex-row items-center gap-2">
            <Icon name="save" size={16} color="#475569" />
            <Text className="text-sm font-semibold text-slate-700">Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-5 py-3 bg-blue-600 rounded-xl flex-row items-center gap-2 shadow-sm">
            <Icon name="send" size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Submit for Approval</Text>
          </TouchableOpacity>
        </View>
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}