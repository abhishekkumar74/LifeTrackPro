import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Target, Timer, BookOpen, BarChart2 } from 'lucide-react-native';

import { useDueRevisions } from '@/lib/hooks/use-notes';

const ACTIVE_COLOR = '#5B4FE8';
const INACTIVE_COLOR = '#9B9BAF';
const TAB_BG_COLOR = '#FFFFFF';
const BORDER_COLOR = '#E8E7E3';

export default function TabLayout(): React.JSX.Element {
  const dueRevisionsQuery = useDueRevisions();
  const dueCount = dueRevisionsQuery.data?.length || 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontFamily: 'DMSans-Medium',
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: TAB_BG_COLOR,
          borderTopWidth: 1,
          borderTopColor: BORDER_COLOR,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          elevation: 0, // remove Android shadow
          shadowOpacity: 0, // remove iOS shadow
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, focused }) => (
            <Target size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, focused }) => (
            <Timer size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, focused }) => (
            <BookOpen size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
          tabBarBadge: dueCount > 0 ? dueCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#E85858',
            color: '#FFFFFF',
            fontSize: 10,
            fontFamily: 'DMSans-Bold',
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <BarChart2 size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
