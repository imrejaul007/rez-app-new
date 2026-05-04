/**
 * Savings Screen
 * Full savings dashboard with all features
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SavingsDashboard from '@/components/wallet/SavingsDashboard';
import { SavingsProvider } from '@/contexts/SavingsContext';
import { Colors } from '@/constants/DesignSystem';

export default function SavingsScreen() {
  return (
    <SafeAreaProvider>
      <SavingsProvider>
        <View style={styles.container}>
          <Stack.Screen
            options={{
              title: 'My Savings',
              headerStyle: { backgroundColor: Colors.primary },
              headerTintColor: '#fff',
            }}
          />
          <SavingsDashboard />
        </View>
      </SavingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
