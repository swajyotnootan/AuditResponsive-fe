// components/navigation/DrawerWrapper.tsx
import { useAuth } from '@/components/context/AuthContext';
import { Menu } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, Modal, TouchableOpacity, View } from 'react-native';
import SmartNavigator from './SmartNavigator';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function DrawerWrapper({ children }: { children: React.ReactNode }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { user } = useAuth();

  const showDrawerButton = user && ['MASTER', 'TOP_MANAGEMENT', 'HR_ADMIN'].includes(
    user.role?.toUpperCase()
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Main Content */}
      {children}

      {/* Floating Drawer Button */}
      {showDrawerButton && (
        <TouchableOpacity
          onPress={() => setDrawerVisible(true)}
          style={{
            position: 'absolute',
            left: 20,
            bottom: 100,
            backgroundColor: '#1e3a5f',
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            zIndex: 1000,
          }}
        >
          <Menu size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Drawer Modal */}
      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Sidebar */}
          <View style={{ 
            width: SCREEN_WIDTH * 0.8, 
            maxWidth: 320,
            backgroundColor: 'white',
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
          }}>
            <SmartNavigator 
              type="drawer" 
              onClose={() => setDrawerVisible(false)} 
            />
          </View>
          
          {/* Overlay */}
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={() => setDrawerVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
}