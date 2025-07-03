// File: app/(tabs)/chat/_layout.tsx

import { Stack } from 'expo-router';
import React from 'react';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Chat',
        }}
      />
      <Stack.Screen
        name="[threadId]"
        options={{
          title: 'Chat Thread',
        }}
      />
    </Stack>
  );
}
