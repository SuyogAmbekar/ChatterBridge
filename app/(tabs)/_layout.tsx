import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="speech"
        options={{
          title: 'Speech',
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: 'Session',
        }}
      />
      <Tabs.Screen
        name="sign"
        options={{
          title: 'Sign',
        }}
      />
    </Tabs>
  );
}
