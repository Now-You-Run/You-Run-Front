import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LoadingOverlayProps {
  title: string;
  subtitle: string;
  type?: 'fullscreen' | 'notification';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  title,
  subtitle,
  type = 'notification'
}) => {
  const containerStyle = type === 'fullscreen' ? styles.fullscreenOverlay : styles.notificationOverlay;

  return (
    <View style={containerStyle}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>{title}</Text>
        <Text style={styles.loadingSubtext}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  notificationOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    zIndex: 1500,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
});
