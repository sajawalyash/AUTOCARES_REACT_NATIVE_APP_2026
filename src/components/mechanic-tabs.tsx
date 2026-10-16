import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../constants/autocares-theme';

export default function MechanicTabs() {
  const insets = useSafeAreaInsets();

  // Bottom inset handling:
  // On Android with 3-button navigation, insets.bottom is typically 40-48dp.
  // On Android with gesture navigation, insets.bottom is typically 16-24dp.
  // On iOS with Home Indicator, insets.bottom is 34dp (or 21dp on mini/iPad).
  // When insets.bottom is 0 (e.g. desktop web or hardware bezel), provide an ergonomic 8-10dp baseline.
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
          title: 'Overview',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarActiveTintColor: theme.colors.orange,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'alert-circle' : 'alert-circle-outline'}
              color={focused ? theme.colors.orange : color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'My Jobs',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'construct' : 'construct-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cash' : 'cash-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
