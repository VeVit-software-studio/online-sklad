import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, RefreshControl, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Package, Barcode, FolderOpen, CircleMinus, CirclePlus,
  Trash, History, X,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { initSupabase, getSupabase } from '../lib/supabase';

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const { theme } = useTheme();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [adjust, setAdjust] = useState(null); // 'in' | 'out' | null
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    await initSupabase();
    const db = getSupabase();
    const { data: p } = await db.from('products').select('*, folders(name)').eq('id', productId).single();
    setProduct(p);
    const { data: h } = await db.from('history').select('*')
      .eq('product_id', productId).order('created_at', { ascending: false }).limit(20);
    setHistory(h || []);
    setRefreshing(false);
  }, [productId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runAdjust = async () => {
    const q = parseFloat(qty.replace(',', '.'));
    if (!q || q <= 0) { Alert.alert('Chyba', 'Zadej platné množství.'); return; }
    setBusy(true);
    const { data, error } = await getSupabase().rpc('stock_adjust', {
      p_qty: q, p_action: adjust, p_product_id: productId,
    });
    setBusy(false);
    setAdjust(null); setQty('1');
    if (error) { Alert.alert('Chyba serveru', error.message); return; }
    if (!data.ok) { Alert.alert('Nelze provést', data.message); return; }
    load();
  };

  const deleteProduct = () => {
    Alert.alert('Smazat produkt?', 'Produkt i jeho historie budou nenávratně smazány.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: async () => {
        await getSupabase().from('products').delete().eq('id', productId);
        navigation.goBack();
      }},
    ]);
  };

  if (!product) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const low = Number(product.min_quantity) > 0 && Number(product.quantity) <= Number(product.min_quantity);
  const Row = ({ Icon, label, value }) => (
    <View style={[styles.row, { backgroundColor: theme.colors.card }]}>
      <Icon size={22} color={theme.colors.primary} />
      <Text style={{ color: theme.colors.subtext, marginLeft: 12, width: 100 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, flex: 1, fontSize: 15 }}>{value}</Text>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
    >
      <View style={styles.header}>
        <Package size={44} color={theme.colors.primary} />
        <Text style={[styles.name, { color: theme.colors.text }]}>{product.name}</Text>
        <Text style={[styles.bigQty, { color: low ? theme.colors.danger : theme.colors.text }]}>
          {Number(product.quantity)} <Text style={{ fontSize: 16 }}>{product.unit}</Text>
        </Text>
        {low && <Text style={{ color: theme.colors.danger, fontSize: 13 }}>⚠ Nízký stav (min. {Number(product.min_quantity)})</Text>}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.danger }]} onPress={() => setAdjust('out')}>
          <CircleMinus size={20} color="white" />
          <Text style={styles.actionBtnText}>Odebrat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.success }]} onPress={() => setAdjust('in')}>
          <CirclePlus size={20} color="white" />
          <Text style={styles.actionBtnText}>Přidat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.card, borderWidth: 1.5, borderColor: theme.colors.border }]} onPress={deleteProduct}>
          <Trash size={20} color={theme.colors.danger} />
        </TouchableOpacity>
      </View>

      <Row Icon={Barcode} label="Kód" value={product.barcode || '—'} />
      <Row Icon={FolderOpen} label="Složka" value={product.folders?.name || '—'} />
      <Row Icon={Package} label="Min. stav" value={`${Number(product.min_quantity)} ${product.unit}`} />
      {product.description ? <Row Icon={Package} label="Poznámka" value={product.description} /> : null}

      <View style={styles.historyHeader}>
        <History size={18} color={theme.colors.subtext} />
        <Text style={{ color: theme.colors.subtext, marginLeft: 8, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>HISTORIE POHYBŮ</Text>
      </View>
      {history.length === 0 && <Text style={{ color: theme.colors.subtext, textAlign: 'center', marginBottom: 20 }}>Zatím žádné pohyby</Text>}
      {history.map((h) => (
        <View key={h.id} style={[styles.historyRow, { backgroundColor: theme.colors.card }]}>
          {h.type === 'in'
            ? <CirclePlus size={20} color={theme.colors.success} />
            : <CircleMinus size={20} color={theme.colors.danger} />}
          <Text style={{ color: theme.colors.text, marginLeft: 10 }}>
            {h.type === 'in' ? '+' : '−'}{Number(h.quantity)} {product.unit}
          </Text>
          <Text style={{ color: theme.colors.subtext, marginLeft: 'auto', fontSize: 12 }}>
            {new Date(h.created_at).toLocaleString('cs-CZ')}
          </Text>
        </View>
      ))}
      <View style={{ height: 40 }} />

      <Modal visible={!!adjust} transparent animationType="fade">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAdjust(null)}>
          <View style={[styles.modal, { backgroundColor: theme.colors.card }]} onStartShouldSetResponder={() => true}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
              {adjust === 'in' ? 'Přidat množství' : 'Odebrat množství'}
            </Text>
            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
              value={qty} onChangeText={setQty} keyboardType="numeric" autoFocus
              onSubmitEditing={runAdjust}
            />
            {busy ? <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} /> : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary, flex: 1 }]} onPress={runAdjust}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>Potvrdit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { borderColor: theme.colors.border, borderWidth: 1.5, flex: 1 }]} onPress={() => setAdjust(null)}>
                  <Text style={{ color: theme.colors.subtext, fontWeight: '700' }}>Zrušit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', padding: 24, gap: 6 },
  name: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  bigQty: { fontSize: 34, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', gap: 8, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: 'white', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 8, elevation: 2 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 8, elevation: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 },
  modal: { borderRadius: 16, padding: 20 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 18 },
  modalBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});