import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import LeadsScreen from '../screens/LeadsScreen';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import ImportsScreen from '../screens/ImportsScreen';
import PipelineScreen from '../screens/PipelineScreen';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import ExportsScreen from '../screens/ExportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { Colors } from '../constants/colors';

export type LeadsStackParamList = {
  LeadsList: undefined;
  LeadDetail: { id: string };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Exports: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator();
const LeadsStack = createNativeStackNavigator<LeadsStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function LeadsNavigator() {
  return (
    <LeadsStack.Navigator>
      <LeadsStack.Screen name="LeadsList" component={LeadsScreen} options={{ title: 'Leads' }} />
      <LeadsStack.Screen name="LeadDetail" component={LeadDetailScreen} options={{ title: 'Lead Detail' }} />
    </LeadsStack.Navigator>
  );
}

function MoreNavigator() {
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: 'More' }} />
      <MoreStack.Screen name="Exports" component={ExportsScreen} options={{ title: 'Exports' }} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </MoreStack.Navigator>
  );
}

function TabIcon({ label }: { label: string }) {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    Leads: '👥',
    Imports: '📥',
    Pipeline: '⚙️',
    More: '☰',
  };
  return <Text style={{ fontSize: 18 }}>{icons[label] ?? '•'}</Text>;
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: () => <TabIcon label={route.name} />,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Leads" component={LeadsNavigator} />
      <Tab.Screen name="Imports" component={ImportsScreen} />
      <Tab.Screen name="Pipeline" component={PipelineScreen} />
      <Tab.Screen name="More" component={MoreNavigator} />
    </Tab.Navigator>
  );
}
