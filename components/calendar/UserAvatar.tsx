// UserAvatar.tsx - FIXED

import { API_BASE_URL } from '@/config/apiConfig';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface UserAvatarProps {
  userId: number | null | undefined;
  userName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export default function UserAvatar({ 
  userId, 
  userName, 
  size = 'sm', 
  showName = false 
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    xs: { container: 20, font: 10, image: 20 },
    sm: { container: 28, font: 12, image: 28 },
    md: { container: 36, font: 14, image: 36 },
    lg: { container: 44, font: 16, image: 44 },
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Unassigned' || name === 'N/A') return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // If no userId or image error, show initials
  if (!userId || imageError) {
    const colors = [
      '#EF4444', '#3B82F6', '#10B981', '#F59E0B', 
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ];
    const colorIndex = userId ? Math.abs(userId) % colors.length : Math.floor(Math.random() * colors.length);
    const bgColor = colors[colorIndex];

    return (
      <View style={[styles.container, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
        <View style={[styles.initialsContainer, { 
          width: sizeMap[size].container, 
          height: sizeMap[size].container, 
          borderRadius: sizeMap[size].container / 2,
          backgroundColor: bgColor 
        }]}>
          <Text style={[styles.initialsText, { fontSize: sizeMap[size].font }]}>
            {getInitials(userName)}
          </Text>
        </View>
        {showName && <Text style={styles.nameText}>{userName}</Text>}
      </View>
    );
  }

  // ✅ FIXED: Use the correct API_BASE_URL from config
  const photoUrl = `${API_BASE_URL}/api/users/${userId}/profile-photo`;

  return (
    <View style={[styles.container, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
      <Image
        source={{ uri: photoUrl }}
        style={[styles.image, { 
          width: sizeMap[size].image, 
          height: sizeMap[size].image, 
          borderRadius: sizeMap[size].image / 2 
        }]}
        onError={() => setImageError(true)}
      />
      {showName && <Text style={styles.nameText}>{userName}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  image: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  nameText: {
    fontSize: 13,
    color: '#374151',
  },
});