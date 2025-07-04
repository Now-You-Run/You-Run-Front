import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type SelectTrackSortDropdownProps = {
  selectedValue: 'proximity' | 'trackDistance' | null;
  onValueChange: (value: 'proximity' | 'trackDistance' | null) => void;
};

export default function SelectTrackSortDropdown({ selectedValue, onValueChange }: SelectTrackSortDropdownProps) {
  return (
    <View style={styles.container}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={(itemValue) => onValueChange(itemValue)}
        mode="dropdown"
        style={styles.picker}
      >
        <Picker.Item label="정렬 선택" value={null} />
        <Picker.Item label="가까운 순" value="proximity" />
        <Picker.Item label="트랙 거리 순" value="trackDistance" />
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#4a90e2',
    borderRadius: 20,
    overflow: 'hidden',
    width: 150,
    marginLeft: 10,
  },
  picker: {
    height: 40,
    color: '#4a90e2',
  },
});
