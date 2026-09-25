import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Modal, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { CirclePlus, CircleMinus, Info } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { initSupabase, getSupabase, getActiveWarehouseId } from '../lib/supabase';

const ACTION_META = {
  add: { title: 'Přidat kusy (příjem)', Icon: CirclePlus, color: '#43a047', type: 'in' },
  remove: { title: 'Odebrat kusy (výdej)', Icon: CircleMinus, color: '#e53935', type: 'out' },
  info: { title: 'Info o produktu', Icon: Info, color: '#1e88e5' },
};

export default function ScannerScreen({ route, navigation }) {
  const { action } = route.params;
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [code, setCode] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);

  const meta = ACTION_META[action];

  useEffect(() => { if (action === 'info' && scanned) showInfo(); }, [scanned]);

  const resetScan = () => { setScanned(false); setQty('1'); setBusy(false); };

  const offerCreate = () => {
    Alert.alert('Neznámý kód', 'Produkt s kódem ' + code + ' v tomto skladu neexistuje.', [
      { text: 'Zrušit', style: 'cancel', onPress: resetScan },
      { text: 'Vytvořit produkt', onPress: () => navigation.replace('AddProduct', { barcode: code }) },
    ]);
  };

  const showInfo = async () => {
    const ok = await initSupabase();
    if (!ok) { Alert.alert('Chybí připojení', 'Nastav server v Nastavení.'); resetScan(); return; }
    setBusy(true);
    const whId = await getActiveWarehouseId();
    const { data } = await getSupabase()
      .from('products').select('*')
      .eq('barcode', code).eq('warehouse_id', whId).maybeSingle();
    setBusy(false);
    if (!data) { offerCreate(); return; }
    navigation.replace('ProductDetail', { productId: data.id });
  };

  const runAdjust = async () => {
    const q = parseFloat(qty.replace(',', '.'));
    if (!q || q <= 0) { Alert.alert('Chyba', 'Zadej platné množství.'); return; }

    const ok = await initSupabase();
    if (!ok) { Alert.alert('Chybí připojení', 'Nastav server v Nastavení.'); return; }

    setBusy(true);
    const whId = await getActiveWarehouseId();
    const { data, error } = await getSupabase().rpc('stock_adjust', {
      p_qty: q, p_action: meta.type, p_warehouse_id: whId, p_barcode: code,
    });
    setBusy(false);

    if (error) { Alert.alert('Chyba serveru', error.message); return; }

    if (!data.ok) {
      if (data.code === 'not_found') { offerCreate(); return; }
      Alert.alert('Nelze provést', data.message);
      resetScan();
      return;
    }

    Alert.alert('Hotovo', `${data.product.name}: nový stav ${data.new_quantity} ${data.product.unit}`,
      [{ text: 'Skenovat další', onPress: resetScan }]);
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ marginBottom: 12, color: theme.colors.text }}>Aplikace potřebuje přístup k fotoaparátu.</Text>
        <Button title="Povolit" color={theme.colors.primary} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CameraView
        style={{ flex: 1 }}
        onBarcodeScanned={scanned ? undefined : ({ data }) => { setCode(data); setScanned(true); }}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'] }}
      />

      {action !== 'info' && (
        <View style={styles.hintWrap}>
          <Text style={styles.hint}>Namiř na čárový kód / QR kód</Text>
        </View>
      )}

      <Modal visible={scanned} transparent animationType="slide">
        <View style={[styles.modal, { backgroundColor: theme.colors.card }]}>
          <View style={styles.titleRow}>
            <meta.Icon size={26} color={meta.color} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{meta.title}</Text>
          </View>
          <Text style={[styles.code, { color: theme.colors.primary }]}>{code}</Text>

          {action === 'info' ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <>
              <Text style={{ color: theme.colors.text }}>Množství:</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
                value={qty}
                onChangeText={setQty}
                keyboardType="numeric"
                autoFocus
              />
              {busy ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <Button
                  title={action === 'add' ? 'Potvrdit příjem' : 'Potvrdit výdej'}
                  color={theme.colors.primary}
                  onPress={runAdjust}
                />
              )}
            </>
          )}

          {action !== 'info' && !busy && (
            <Button title="Skenovat další" color="#888" onPress={resetScan} />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hintWrap: { position: 'absolute', top: 24, left: 0, right: 0, alignItems: 'center' },
  hint: { color: 'white', fontSize: 15, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  modal: { marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  code: { fontSize: 20, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 18, marginVertical: 12 },
});