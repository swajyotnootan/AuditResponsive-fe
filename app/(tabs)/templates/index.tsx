import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: number;
  usage: number;
  icon: string;
  color: string;
}

const templates: Template[] = [
  {
    id: '1',
    name: 'Financial Audit',
    description: 'Complete financial audit including balance sheet, income statement, and cash flow analysis.',
    category: 'Financial',
    steps: 12,
    usage: 145,
    icon: '💰',
    color: '#6C63FF',
  },
  {
    id: '2',
    name: 'ISO 9001 Compliance',
    description: 'Quality management system audit for ISO 9001 certification.',
    category: 'Compliance',
    steps: 15,
    usage: 89,
    icon: '📋',
    color: '#3B82F6',
  },
  {
    id: '3',
    name: 'IT Security Assessment',
    description: 'Comprehensive IT security audit including vulnerability and penetration testing.',
    category: 'IT Audit',
    steps: 18,
    usage: 67,
    icon: '🛡️',
    color: '#EF4444',
  },
  {
    id: '4',
    name: 'Environmental Impact',
    description: 'Environmental compliance audit for regulatory requirements.',
    category: 'Environmental',
    steps: 10,
    usage: 34,
    icon: '🌱',
    color: '#10B981',
  },
  {
    id: '5',
    name: 'HR Compliance Review',
    description: 'Human resources compliance audit covering policies and procedures.',
    category: 'Compliance',
    steps: 8,
    usage: 23,
    icon: '👥',
    color: '#F59E0B',
  },
  {
    id: '6',
    name: 'Supply Chain Audit',
    description: 'Audit of supply chain processes, vendor management, and logistics.',
    category: 'Operational',
    steps: 14,
    usage: 12,
    icon: '🚚',
    color: '#8B5CF6',
  },
];

export default function TemplatesScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const categories = ['all', 'Financial', 'Compliance', 'IT Audit', 'Environmental', 'Operational'];

  const filteredTemplates = templates.filter(
    template => selectedCategory === 'all' || template.category === selectedCategory
  );

  const useTemplate = (template: Template) => {
    Alert.alert(
      'Use Template',
      `Create a new audit from "${template.name}" template?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Audit', 
          onPress: () => {
            router.push('/create' as any);
          }
        }
      ]
    );
  };

  const renderTemplate = ({ item }: { item: Template }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100"
      onPress={() => useTemplate(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        <View 
          className="w-14 h-14 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${item.color}20` }}
        >
          <Text className="text-3xl">{item.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
          <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={2}>
            {item.description}
          </Text>
          <View className="flex-row items-center mt-2">
            <View 
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${item.color}20` }}
            >
              <Text style={{ color: item.color }} className="text-xs font-medium">
                {item.category}
              </Text>
            </View>
            <Text className="text-xs text-gray-400 ml-3">
              <Feather name="check-square" size={10} color="#9CA3AF" /> {item.steps} steps
            </Text>
            <Text className="text-xs text-gray-400 ml-3">
              <Feather name="users" size={10} color="#9CA3AF" /> {item.usage} used
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#6C63FF', '#8B83FF']}
          className="px-5 pt-4 pb-8 rounded-b-3xl"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text className="text-white text-2xl font-bold">Audit Templates</Text>
          <Text className="text-white/80 text-sm mt-1">
            Start with a pre-built template or create your own
          </Text>
          
          <View className="flex-row mt-4 gap-3">
            <TouchableOpacity 
              className="flex-1 bg-white/20 p-3 rounded-xl flex-row items-center justify-center"
              onPress={() => router.push('/create' as any)}
            >
              <Feather name="plus" size={18} color="white" />
              <Text className="text-white font-semibold ml-2">Create New</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white/20 p-3 rounded-xl flex-row items-center justify-center">
              <Feather name="download" size={18} color="white" />
              <Text className="text-white font-semibold ml-2">Import</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View className="px-5 pt-4">
          <Text className="text-sm font-semibold text-gray-700 mb-3">Categories</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                className={`px-4 py-2 rounded-full mr-2 ${
                  selectedCategory === category ? 'bg-primary' : 'bg-white border border-gray-200'
                }`}
                onPress={() => setSelectedCategory(category)}
              >
                <Text className={`capitalize ${
                  selectedCategory === category ? 'text-white' : 'text-gray-600'
                }`}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredTemplates}
            renderItem={renderTemplate}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View className="py-20 items-center">
                <Feather name="file-text" size={48} color="#D1D5DB" />
                <Text className="text-gray-500 text-center mt-4">No templates found</Text>
              </View>
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}