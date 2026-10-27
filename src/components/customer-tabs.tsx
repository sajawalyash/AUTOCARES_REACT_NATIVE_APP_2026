import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../constants/autocares-theme';

export default function CustomerTabs() {
  const insets = useSafeAreaInsets();

  const hasBottomInset = insets.bottom > 0;
  const bottomPadding = hasBottomInset
    ? insets.bottom + (Platform.OS === 'android' ? 6 : 4)
    : Platform.OS === 'android' ? 10 : 8;

  const topPadding = 8;
  const contentHeight = 50;
  const tabHeight = contentHeight + topPadding + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
          marginBottom: 0,
          letterSpacing: 0.1,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth || 1,
          height: tabHeight,
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          elevation: 10,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color as string} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="mechanics"
        options={{
          title: 'Mechanics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} color={color as string} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-help"
        options={{
          title: 'AI Assistant',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              color={color as string}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} color={color as string} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color as string} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
