import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SelectTackTabSelectorProps = {
  selectedTab: 'server' | 'local';
  onSelectTab: (tab: 'server' | 'local') => void;
};

export default function SelectTrackTabSelector({ selectedTab, onSelectTab }: SelectTackTabSelectorProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'local' && styles.tabButtonActive, { marginRight: 10 }]}
        onPress={() => onSelectTab('local')}
      >
        <Text style={[styles.tabButtonText, selectedTab === 'local' && styles.tabButtonTextActive]}>
          내 로컬 트랙
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'server' && styles.tabButtonActive, { marginLeft: 10 }]}
        onPress={() => onSelectTab('server')}
      >
        <Text style={[styles.tabButtonText, selectedTab === 'server' && styles.tabButtonTextActive]}>
          전국 트랙
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tabButtonActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
});
