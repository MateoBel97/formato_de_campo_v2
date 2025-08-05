import React, { useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, Platform, TouchableOpacity, Keyboard, InputAccessoryView } from 'react-native';
import { COLORS } from '../constants';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  horizontal?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  error, 
  required = false, 
  horizontal = false,
  style,
  keyboardType,
  ...props 
}) => {
  const inputRef = useRef<TextInput>(null);
  const inputAccessoryViewID = `${label}-input-accessory`;
  
  const isNumericKeyboard = keyboardType === 'numeric' || keyboardType === 'number-pad' || keyboardType === 'decimal-pad';
  const shouldShowDoneButton = Platform.OS === 'ios' && isNumericKeyboard;

  const handleDone = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  const renderInputAccessoryView = () => {
    if (!shouldShowDoneButton) return null;
    
    return (
      <InputAccessoryView nativeID={inputAccessoryViewID}>
        <View style={styles.inputAccessory}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Listo</Text>
          </TouchableOpacity>
        </View>
      </InputAccessoryView>
    );
  };
  if (horizontal) {
    return (
      <>
        <View style={styles.horizontalContainer}>
          <View style={styles.horizontalLabelContainer}>
            <Text style={styles.horizontalLabel}>{label}</Text>
            {required && <Text style={styles.required}>*</Text>}
          </View>
          <View style={styles.horizontalInputContainer}>
            <TextInput
              ref={inputRef}
              style={[
                styles.horizontalInput,
                error && styles.inputError,
                style,
              ]}
              placeholderTextColor={COLORS.textSecondary}
              keyboardType={keyboardType}
              inputAccessoryViewID={shouldShowDoneButton ? inputAccessoryViewID : undefined}
              {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </View>
        {renderInputAccessoryView()}
      </>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={COLORS.textSecondary}
          keyboardType={keyboardType}
          inputAccessoryViewID={shouldShowDoneButton ? inputAccessoryViewID : undefined}
          {...props}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
      {renderInputAccessoryView()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  required: {
    color: COLORS.error,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalLabelContainer: {
    flexDirection: 'row',
    flex: 0.25,
  },
  horizontalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  horizontalInputContainer: {
    flex: 0.75,
    marginLeft: 12,
  },
  horizontalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    minHeight: 36,
  },
  inputAccessory: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  doneButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FormInput;