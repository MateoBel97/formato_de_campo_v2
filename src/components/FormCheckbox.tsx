import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface FormCheckboxProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  error?: string;
  required?: boolean;
}

const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  value,
  onValueChange,
  error,
  required = false,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => onValueChange(!value)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.checkbox,
          value && styles.checkboxChecked,
          error && styles.checkboxError,
        ]}>
          {value && (
            <Feather name="check" size={16} color={COLORS.surface} />
          )}
        </View>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxError: {
    borderColor: COLORS.error,
  },
  labelContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  required: {
    color: COLORS.error,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 36,
  },
});

export default FormCheckbox;