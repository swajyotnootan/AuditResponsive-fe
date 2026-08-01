// components/ui/tabs/index.tsx - Updated Trigger
import { Feather } from '@expo/vector-icons';
import React, { createContext, ReactNode, useContext, useState } from 'react';
import {
    GestureResponderEvent,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableOpacityProps,
    View,
    ViewStyle,
} from 'react-native';

// ─── Types ──────────────────────────────────────────────────────────────────
interface TabsContextType {
  activeTab: string;
  setActiveTab: (name: string) => void;
}

interface NativeTabsProps {
  children: ReactNode;
  style?: ViewStyle;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

interface TriggerProps extends Omit<TouchableOpacityProps, 'onPress'> {
  name: string;
  children: ReactNode;
  isActive?: boolean;
  onPress?: (event: GestureResponderEvent) => void; // ✅ Proper type
}

interface IconProps {
  name?: string;
  size?: number;
  color?: string;
  md?: string;
  sf?: string;
}

interface LabelProps {
  children: ReactNode;
  style?: TextStyle;
}

// ─── Context ────────────────────────────────────────────────────────────────
const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
};

// ─── NativeTabs Container ──────────────────────────────────────────────────
export function NativeTabs({
  children,
  style,
  defaultValue = '',
  onValueChange,
}: NativeTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (name: string) => {
    setActiveTab(name);
    if (onValueChange) {
      onValueChange(name);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <View style={[styles.container, style]}>{children}</View>
    </TabsContext.Provider>
  );
}

// ─── Trigger Component ─────────────────────────────────────────────────────
function Trigger({ name, children, isActive, onPress, ...props }: TriggerProps) {
  const context = useTabsContext();
  const active = isActive ?? context.activeTab === name;

  // ✅ Fixed: Properly handle the press event
  const handlePress = (event: GestureResponderEvent) => {
    if (onPress) {
      onPress(event);
    } else {
      context.setActiveTab(name);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.trigger, active && styles.triggerActive]}
      onPress={handlePress}
      activeOpacity={0.7}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}

// ─── Trigger Icon ──────────────────────────────────────────────────────────
function Icon({ name, size = 24, color = '#9CA3AF', md, sf }: IconProps) {
  const iconName = md || sf || name || 'circle';
  
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={iconName as any} size={size} color={color} />
    </View>
  );
}

// ─── Trigger Label ─────────────────────────────────────────────────────────
function Label({ children, style }: LabelProps) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

// ✅ Attach sub-components
Trigger.Icon = Icon;
Trigger.Label = Label;

// ─── NativeTabs with Trigger attached ─────────────────────────────────────
NativeTabs.Trigger = Trigger;

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    height: 70,
  },
  trigger: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  triggerActive: {},
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '400',
    marginTop: 2,
  },
});

export default NativeTabs;