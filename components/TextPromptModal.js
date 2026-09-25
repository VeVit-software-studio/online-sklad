import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';

export default function TextPromptModal({ visible, title, placeholder, onSubmit, onClose, theme }) {
  const [value, setValue] = useState('');

  useEffect(() => { if (visible) setValue(''); }, [visible]);

  const submit = () => {
    const v = value.trim();
    onClose();
    if (v) onSubmit(v);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]} onStartShouldSetResponder={() => true}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.subtext}
            value={value}
            onChangeText={setValue}
            autoFocus
            onSubmitEditing={submit}
          />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={submit}>
              <Check size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnCancel, { borderColor: theme.colors.border }]} onPress={onClose}>
              <X size={20} color={theme.colors.subtext} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: { borderRadius: 16, padding: 20, width: '100%', elevation: 8 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnCancel: { borderWidth: 1.5 },
});