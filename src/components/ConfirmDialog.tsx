import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants';
import HoldToDeleteButton from './HoldToDeleteButton';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmColor?: string;
  icon?: keyof typeof Feather.glyphMap;
  useHoldToDelete?: boolean;
  holdDuration?: number;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  confirmColor = COLORS.error,
  icon = 'alert-circle',
  useHoldToDelete = false,
  holdDuration = 3000,
}) => {
  const handleDeleteComplete = () => {
    onConfirm();
    onCancel(); // Close dialog after confirm
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: confirmColor + '15' }]}>
            <Feather name={icon} size={32} color={confirmColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons or Hold-to-Delete */}
          {useHoldToDelete ? (
            <View style={styles.holdToDeleteContainer}>
              <HoldToDeleteButton
                onDeleteComplete={handleDeleteComplete}
                duration={holdDuration}
                color={confirmColor}
              />
              <TouchableOpacity
                style={[styles.button, styles.cancelButtonFullWidth]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton, { backgroundColor: confirmColor }]}
                onPress={() => {
                  onConfirm();
                  onCancel(); // Close dialog after confirm
                }}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  confirmButton: {
    // backgroundColor set dynamically via confirmColor prop
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  holdToDeleteContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 32,
  },
  cancelButtonFullWidth: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

export default ConfirmDialog;
