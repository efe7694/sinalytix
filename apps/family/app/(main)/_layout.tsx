import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { usePatientsStore } from '@/store/patients';
import { useTasksStore } from '@/store/tasks';
import { useNotificationsStore } from '@/store/notifications';
import { useDndStore } from '@/store/dnd';

const BRAND = '#6366F1';

export default function MainLayout() {
  const { patients, selectedPatientId, fetchPatients } = usePatientsStore();
  const { fetchTodayTasks } = useTasksStore();
  const { fetchNotifications, unreadCount } = useNotificationsStore();
  const { fetchDnd } = useDndStore();

  useEffect(() => {
    fetchPatients();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchTodayTasks(selectedPatientId);
      fetchDnd(selectedPatientId);
    }
  }, [selectedPatientId]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Görevler',
          tabBarIcon: ({ color }) => <TabIcon emoji="✅" color={color} />,
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
  return (
    <Text style={{ fontSize: 20, opacity: color === BRAND ? 1 : 0.5 }}>{emoji}</Text>
  );
}
