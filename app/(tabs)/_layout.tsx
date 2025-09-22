import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import "../global.css";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffffff', // active icon/text color
        tabBarInactiveTintColor: '#a1a1aa', // inactive icon/text color
        tabBarStyle: [
          {
            backgroundColor: '#4b5563', // gray background
            borderTopColor: '#374151',   // optional border top color
          },
          Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="speech"
        options={{
          title: 'Speech',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'mic' : 'mic-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: 'Session',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sign"
        options={{
          title: 'Sign',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'hand-left' : 'hand-left-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
