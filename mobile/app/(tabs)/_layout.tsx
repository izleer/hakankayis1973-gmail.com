import { Text, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { theme } from '@/src/theme';

function Glyph({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18, lineHeight: 22 }}>{symbol}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.green,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
        sceneStyle: { backgroundColor: theme.colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana',
          tabBarIcon: ({ color }) => <Glyph symbol="⌂" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Varlıklar',
          tabBarIcon: ({ color }) => <Glyph symbol="▤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{
          title: 'Aktarım',
          tabBarIcon: ({ color }) => <Glyph symbol="⇅" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => <Glyph symbol="⚙" color={color} />,
        }}
      />
    </Tabs>
  );
}
