import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { theme } from '../constants/autocares-theme';

export interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  editable?: boolean;
  onPress?: () => void;
  onImagePicked?: (uri: string) => Promise<void> | void;
  style?: StyleProp<ViewStyle>;
}

export async function pickAvatarImage(): Promise<string | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo gallery to select a profile picture.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    if (asset.base64) {
      const mime = asset.mimeType || 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }
    return asset.uri;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    Alert.alert('Error', `Failed to open image picker: ${message}`);
    return null;
  }
}

export function Avatar({
  url,
  name,
  size = 48,
  editable = false,
  onPress,
  onImagePicked,
  style,
}: AvatarProps) {
  const [uploading, setUploading] = useState(false);

  const initials = (name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('') || 'U';

  async function handlePick() {
    if (!editable || uploading) return;
    setUploading(true);
    try {
      const uri = await pickAvatarImage();
      if (uri && onImagePicked) {
        await onImagePicked(uri);
      }
    } finally {
      setUploading(false);
    }
  }

  const containerSize = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const badgeSize = Math.max(20, Math.round(size * 0.32));
  const badgeRadius = badgeSize / 2;
  const iconSize = Math.max(11, Math.round(badgeSize * 0.55));
  const fontSize = Math.max(12, Math.round(size * 0.38));

  const content = (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.avatarBox, containerSize]}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={[styles.image, containerSize]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.fallback, containerSize]}>
            <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
          </View>
        )}

        {uploading && (
          <View style={[styles.loadingOverlay, containerSize]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}
      </View>

      {editable && (
        <View
          style={[
            styles.editBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeRadius,
              right: -2,
              bottom: -2,
            },
          ]}>
          <Ionicons name="camera" size={iconSize} color="#FFFFFF" />
        </View>
      )}
    </View>
  );

  if (editable) {
    return (
      <Pressable
        onPress={handlePick}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Change profile image">
        {content}
      </Pressable>
    );
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`View ${name || 'User'} profile`}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatarBox: {
    overflow: 'hidden',
    backgroundColor: '#E0F2FE',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    backgroundColor: '#38B8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    backgroundColor: theme.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
