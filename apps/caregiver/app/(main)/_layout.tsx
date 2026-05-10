import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { usePatientsStore } from '@/store/patients';
import { useShiftsStore } from '@/store/shifts';

export default function MainLayout() {
  const { fetchPatients } = usePatientsStore();
  const { fetchActiveShift } = useShiftsStore();

  useEffect(() => {
    fetchPatients();
    fetchActiveShift();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            // Using emoji as icon placeholder — replace with @expo/vector-icons in production
            <TabIcon emoji="🏠" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color === '#059669' ? 1 : 0.5 }}>{emoji}</Text>;
}
