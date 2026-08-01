// src/components/common/YearFilter.tsx

import React, { useMemo } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface YearFilterProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  availableYears?: number[];
}

const YearFilter: React.FC<YearFilterProps> = ({
  selectedYear,
  onYearChange,
  availableYears = [],
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);

  const formatFinancialYear = (year: number): string => {
    return `FY ${year}-${(year + 1).toString().slice(-2)}`;
  };

  const years = useMemo(() => {
    if (availableYears.length > 0) return availableYears;
    const startYear = 2020;
    const endYear = 2030;
    const yearList: number[] = [];
    for (let i = startYear; i <= endYear; i++) {
      yearList.push(i);
    }
    return yearList.sort((a, b) => b - a);
  }, [availableYears]);

  const handleSelect = (year: number) => {
    onYearChange(year);
    setModalVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Icon name="calendar" size={16} color="#6b7280" />
        <Text style={styles.selectedText}>{formatFinancialYear(selectedYear)}</Text>
        <Icon name="chevron-down" size={16} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Financial Year</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="x" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={years}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.yearItem,
                    selectedYear === item && styles.yearItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.yearItemText,
                      selectedYear === item && styles.yearItemTextSelected,
                    ]}
                  >
                    {formatFinancialYear(item)}
                  </Text>
                  {selectedYear === item && (
                    <Icon name="check" size={16} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      },
    }),
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  yearItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  yearItemSelected: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  yearItemText: {
    fontSize: 14,
    color: '#4B5563',
  },
  yearItemTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
});

export default YearFilter;