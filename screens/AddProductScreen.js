import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Barcode, QrCode, Camera, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';
import { initSupabase, getSupabase, getActiveWarehouseId } from '../lib/supabase';

export default function AddProductScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(route.params?.barcode || '');
  const [unit, setUnit] = useState('ks');
  const [description, setDescription] = useState('');
  const [minQty, setMinQty] = useState('0');
  const [qty, setQty] = useState('0');
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => { (async () => {
    const ok = await initSupabase();
    if (!ok) { Alert.alert('Chybí připojení', 'Nejdřív nastav server v Nastavení.'); navigation.goBack(); return; }
    const whId = await getActiveWarehouseId();
    const { data } = await getSupabase().from('folders').select('*').eq('warehouse_id', whId).order('name');
    setFolders(data || []);
  })(); }, []);

  const generateCode = () => {
    setBarcode('SKL-' + Date.now().toString(36).toUpperCase() + Math.floor(100 + Math.random() * 900));
  };

  const startScan = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScanning(true);
  };

  const save = async () => {
    if (!name.trim()) { Alert.alert('Chybí název', 'Zadej název produktu.'); return; }
    setSaving(true);
    const whId = await getActiveWarehouseId();
    const { error } = await getSupabase().from('products').insert({
      warehouse_id: whId,
      folder_id: folderId,
      name: name.trim(),
      barcode: barcode.trim() || null,
      quantity: parseFloat(qty.replace(',', '.')) || 0,
      unit: unit.trim() || 'ks',
      description: description.trim() || null,
      min_quantity: parseFloat(minQty.replace(',', '.')) || 0,
    });
    setSaving(false);
    if (error) {
      const dup = error.code === '23505' || /duplicate|unique/i.test(error.message);
      Alert.alert('Chyba', dup ? 'Produkt s tímto kódem už v tomto skladu existuje.' : error.message);
      return;
    }
    navigation.goBack();
  };

  const label = (t) => <Text style={[styles.label, { color: theme.colors.subtext }]}>{t}</Text>;
  const input = (extra) => [{
    backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border,
    color: theme.colors.text,
  }, styles.input, extra];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>

      {label('Název produktu *')}
      <TextInput style={input()} value={name} onChangeText={setName} placeholder="např. Šrouby M6" placeholderTextColor={theme.colors.subtext} />

      {label('Čárový kód')}
      <View style={styles.barcodeRow}>
        <TextInput
          style={input({ flex: 1 })}
          value={barcode} onChangeText={setBarcode}
          placeholder="EAN / QR obsah" placeholderTextColor={theme.colors.subtext}
          autoCapitalize="characters" autoCorrect={false}
        />
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={startScan}>
          <Camera size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={generateCode}>
          <QrCode size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {barcode.length > 0 && (
        <View style={[styles.qrCard, { backgroundColor: theme.colors.card }]}>
          <Text style={{ color: theme.colors.subtext, fontSize: 12, marginBottom: 10 }}>
            QR kód k vytisknutí (stačí screenshot):
          </Text>
          <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, alignSelf: 'center' }}>
            <QRCode value={barcode} size={170} />
          </View>
        </View>
      )}

      <View style={styles.twoCols}>
        <View style={{ flex: 1 }}>
          {label('Počáteční množství')}
          <TextInput style={input()} value={qty} onChangeText={setQty} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          {label('Jednotka')}
          <TextInput style={input()} value={unit} onChangeText={setUnit} placeholder="ks / kg / m" placeholderTextColor={theme.colors.subtext} />
        </View>
      </View>

      {label('Minimální stav (výstražný)')}
      <TextInput style={input()} value={minQty} onChangeText={setMinQty} keyboardType="numeric" />

      {label('Složka')}
      <View style={styles.chipRow}>
        <Chip theme={theme} label="Bez složky" active={folderId === null} onPress={() => setFolderId(null)} />
        {folders.map((f) => (
          <Chip key={f.id} theme={theme} label={f.name} active={folderId === f.id} onPress={() => setFolderId(f.id)} />
        ))}
      </View>

      {label('Poznámky')}
      <TextInput style={input({ minHeight: 80, textAlignVertical: 'top' })} value={description} onChangeText={setDescription} multiline />

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
        onPress={save} disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="white" />
          : <Text style={styles.saveBtnText}>Uložit produkt</Text>}
      </TouchableOpacity>

      <Modal visible={scanning} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={({ data }) => { setBarcode(data); setScanning(false); }}
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'] }}
          />
          <TouchableOpacity style={styles.closeScan} onPress={() => setScanning(false)}>
            <X size={26} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Chip({ theme, label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.card, borderColor: active ? theme.colors.primary : theme.colors.border }]}
      onPress={onPress}
    >
      <Text style={{ color: active ? 'white' : theme.colors.text, fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  barcodeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { borderWidth: 1, borderRadius: 10, width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
  qrCard: { borderRadius: 14, padding: 16, marginTop: 4 },
  twoCols: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  closeScan: { position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 25, padding: 10 },
});