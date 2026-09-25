import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Warehouse, FolderOpen, Trash, Check, Plus } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { initSupabase, getSupabase, getActiveWarehouseId, setActiveWarehouseId } from '../lib/supabase';
import TextPromptModal from '../components/TextPromptModal';

export default function WarehouseScreen({ navigation }) {
  const { theme } = useTheme();
  const [warehouses, setWarehouses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addModal, setAddModal] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const ok = await initSupabase();
    if (!ok) { setWarehouses([]); setRefreshing(false); return; }
    const db = getSupabase();
    const { data: wh } = await db.from('warehouses').select('*').order('name');
    const list = wh || [];
    let id = await getActiveWarehouseId();
    if (!id || !list.some((w) => w.id === id)) {
      id = list[0]?.id ?? null;
      if (id) await setActiveWarehouseId(id);
    }
    setWarehouses(list);
    setActiveId(id);
    if (id) {
      const { data: fl } = await db.from('folders').select('*').eq('warehouse_id', id).order('name');
      setFolders(fl || []);
    } else setFolders([]);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activate = async (id) => {
    await setActiveWarehouseId(id);
    load();
  };

  const createWarehouse = async (name) => {
    const { error } = await getSupabase().from('warehouses').insert({ name });
    if (error) Alert.alert('Chyba', error.message);
    load();
  };

  const deleteWarehouse = (w) => {
    Alert.alert('Smazat sklad?', `Sklad „${w.name}" i všechny jeho produkty a složky budou smazány.`, [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: async () => {
        await getSupabase().from('warehouses').delete().eq('id', w.id);
        if (activeId === w.id) await setActiveWarehouseId(null);
        load();
      }},
    ]);
  };

  const deleteFolder = (f) => {
    Alert.alert('Smazat složku?', `Složka „${f.name}" bude smazána. Produkty zůstanou (bez složky).`, [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: async () => {
        await getSupabase().from('folders').delete().eq('id', f.id);
        load();
      }},
    ]);
  };

  const Section = ({ title }) => (
    <Text style={{ color: theme.colors.subtext, fontWeight: '700', fontSize: 12, letterSpacing: 1, marginHorizontal: 16, marginTop: 16, marginBottom: 8 }}>{title}</Text>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
    >
      <Section title="SKLADY" />
      {warehouses.map((w) => (
        <View key={w.id} style={[styles.row, { backgroundColor: theme.colors.card }, activeId === w.id && { borderColor: theme.colors.primary, borderWidth: 1.5 }]}>
          <TouchableOpacity style={styles.rowMain} onPress={() => activate(w.id)}>
            <View style={[styles.iconBox, { backgroundColor: activeId === w.id ? theme.colors.primary : theme.colors.subtext }]}>
              <Warehouse size={20} color="white" />
            </View>
            <Text style={{ color: theme.colors.text, fontSize: 16, flex: 1 }}>{w.name}</Text>
            {activeId === w.id && <Check size={22} color={theme.colors.primary} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteWarehouse(w)} style={{ padding: 8 }}>
            <Trash size={20} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: theme.colors.primary }]} onPress={() => setAddModal(true)}>
        <Plus size={20} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Nový sklad</Text>
      </TouchableOpacity>

      {activeId && (
        <>
          <Section title={`SLOŽKY V AKTIVNÍM SKLADU`} />
          {folders.length === 0 && (
            <Text style={{ color: theme.colors.subtext, marginHorizontal: 16, marginBottom: 8 }}>
              Žádné složky – vytvoříš je z hlavní obrazovky (Nová složka).
            </Text>
          )}
          {folders.map((f) => (
            <View key={f.id} style={[styles.row, { backgroundColor: theme.colors.card }]}>
              <View style={styles.rowMain}>
                <View style={[styles.iconBox, { backgroundColor: '#8e24aa' }]}>
                  <FolderOpen size={20} color="white" />
                </View>
                <Text style={{ color: theme.colors.text, fontSize: 16 }}>{f.name}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteFolder(f)} style={{ padding: 8 }}>
                <Trash size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
      <View style={{ height: 40 }} />

      <TextPromptModal
        visible={addModal}
        title="Nový sklad"
        placeholder="Název skladu"
        theme={theme}
        onSubmit={createWarehouse}
        onClose={() => setAddModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 8, paddingLeft: 12, marginHorizontal: 16, marginBottom: 8, elevation: 2 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
});