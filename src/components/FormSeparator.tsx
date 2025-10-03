import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

const FormSeparator: React.FC = () => {
  return <View style={styles.separator} />;
};

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
});

export default FormSeparator;
