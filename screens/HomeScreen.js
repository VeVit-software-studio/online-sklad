import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Warehouse, List, X, CirclePlus, CircleMinus, Camera, Search,
  FolderOpen, ArrowLeftRight, Settings, Info, ChevronLeft, TriangleAlert, Package, Database,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { initSupabase, getSupabase, getActiveWarehouseId } from '../lib/supabase';
import TextPromptModal from '../components/TextPromptModal';

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scannerMenuOpen, setScannerMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dbConnected, setDbConnected] = useState(true);
  const [warehouse, setWarehouse] = useState(null);
  const [folders, setFolders] = useState([]);
  const [folderFilter, setFolderFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [folderModal, setFolderModal] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const ok = await initSupabase();
    setDbConnected(ok);
    if (!ok) { setWarehouse(null); setProducts([]); setFolders([]); setRefreshing(false); return; }

    const db = getSupabase();
    const { data: whList, error } = await db.from('warehouses').select('*').order('name');
    if (error) { Alert.alert('Chyba databáze', error.message); setRefreshing(false); return; }

    const list = whList || [];
    let whId = await getActiveWarehouseId();
    if (!whId || !list.some((w) => w.id === whId)) whId = list[0]?.id ?? null;
    const wh = list.find((w) => w.id === whId) || null;
    setWarehouse(wh);

    if (!wh) { setProducts([]); setFolders([]); setRefreshing(false); return; }

    const { data: fl } = await db.from('folders').select('*').eq('warehouse_id', wh.id).order('name');
    setFolders(fl || []);

    let q = db.from('products').select('*').eq('warehouse_id', wh.id);
    if (folderFilter === 'none') q = q.is('folder_id', null);
    else if (folderFilter !== 'all') q = q.eq('folder_id', folderFilter);
    const { data: prods } = await q.order('name');
    setProducts(prods || []);
    setRefreshing(false);
  }, [folderFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { if (warehouse) load(); }, [folderFilter]);

  const closeMenu = () => { setMenuOpen(false); setScannerMenuOpen(false); };
  const openScanner = (action) => { closeMenu(); navigation.navigate('Scanner', { action }); };

  const newFolder = async (name) => {
    const db = getSupabase();
    if (!db || !warehouse) return;
    const { error } = await db.from('folders').insert({ warehouse_id: warehouse.id, name });
    if (error) Alert.alert('Chyba', 'Složku nelze vytvořit – možná už existuje.');
    else load();
  };

  const renderProduct = ({ item }) => {
    const low = Number(item.min_quantity) > 0 && Number(item.quantity) <= Number(item.min_quantity);
    const folder = folders.find((f) => f.id === item.folder_id);
    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: theme.colors.card }]}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        <View style={styles.productMain}>
          <Text style={[styles.productName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.productSub, { color: theme.colors.subtext }]} numberOfLines={1}>
            {item.barcode || 'bez kódu'}{folder ? `  •  ${folder.name}` : ''}
          </Text>
        </View>
        <View style={styles.qtyCol}>
          <Text style={[styles.qty, { color: low ? theme.colors.danger : theme.colors.text }]}>
            {Number(item.quantity)}
            <Text style={{ fontSize: 12 }}> {item.unit}</Text>
          </Text>
          {low && (
            <View style={styles.lowRow}>
              <TriangleAlert size={13} color={theme.colors.danger} />
              <Text style={[styles.lowText, { color: theme.colors.danger }]}>nízký stav</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const emptyContent = () => {
    if (!dbConnected) {
      return (
        <View style={styles.emptyCard}>
          <Database size={40} color={theme.colors.subtext} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Databáze není připojena</Text>
          <Text style={[styles.emptyText, { color: theme.colors.subtext }]}>Vlož Supabase URL a API klíč v nastavení.</Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.emptyBtnText}>Otevřít nastavení</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!warehouse) {
      return (
        <View style={styles.emptyCard}>
          <Warehouse size={40} color={theme.colors.subtext} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Žádný sklad</Text>
          <Text style={[styles.emptyText, { color: theme.colors.subtext }]}>Vytvoř svůj první sklad.</Text>
          <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate('Warehouse')}>
            <Text style={styles.emptyBtnText}>Vytvořit sklad</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyCard}>
        <Package size={40} color={theme.colors.subtext} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Žádné produkty</Text>
        <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate('AddProduct')}>
          <Text style={styles.emptyBtnText}>Přidat produkt</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Warehouse size={26} color={theme.colors.primary} />
              <Text style={[styles.header, { color: theme.colors.text }]}>{warehouse ? warehouse.name : 'Sklad'}</Text>
            </View>
            {dbConnected && folders.length > 0 && (
              <View style={styles.chipRow}>
                <Chip theme={theme} label="Vše" active={folderFilter === 'all'} onPress={() => setFolderFilter('all')} />
                <Chip theme={theme} label="Bez složky" active={folderFilter === 'none'} onPress={() => setFolderFilter('none')} />
                {folders.map((f) => (
                  <Chip key={f.id} theme={theme} label={f.name} active={folderFilter === f.id} onPress={() => setFolderFilter(f.id)} />
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={emptyContent()}
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load}
            tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
      />

      {menuOpen && (
        <TouchableOpacity style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} activeOpacity={1} onPress={closeMenu}>
          <View style={[styles.menu, { backgroundColor: theme.colors.card }]}>
            {scannerMenuOpen ? (
              <>
                <MenuItem theme={theme} Icon={CirclePlus} color="#43a047" label="Přidat produkt (příjem)" onPress={() => openScanner('add')} />
                <MenuItem theme={theme} Icon={CircleMinus} color="#e53935" label="Odebrat produkt (výdej)" onPress={() => openScanner('remove')} />
                <MenuItem theme={theme} Icon={Info} color="#1e88e5" label="Skenovat – info o produktu" onPress={() => openScanner('info')} />
                <MenuItem theme={theme} Icon={ChevronLeft} color="#78909c" label="Zpět" onPress={() => setScannerMenuOpen(false)} />
              </>
            ) : (
              <>
                <MenuItem theme={theme} Icon={CirclePlus} color="#43a047" label="Nový produkt" onPress={() => { closeMenu(); navigation.navigate('AddProduct'); }} />
                <MenuItem theme={theme} Icon={Camera} color="#5e35b1" label="Skener" onPress={() => setScannerMenuOpen(true)} />
                <MenuItem theme={theme} Icon={Search} color="#fb8c00" label="Hledat produkt" onPress={() => { closeMenu(); navigation.navigate('Search'); }} />
                <MenuItem theme={theme} Icon={FolderOpen} color="#8e24aa" label="Nová složka" onPress={() => { closeMenu(); setFolderModal(true); }} />
                <MenuItem theme={theme} Icon={ArrowLeftRight} color="#546e7a" label="Přepnout sklad" onPress={() => { closeMenu(); navigation.navigate('Warehouse'); }} />
                <MenuItem theme={theme} Icon={Settings} color="#607d8b" label="Nastavení" onPress={() => { closeMenu(); navigation.navigate('Settings'); }} />
              </>
            )}
          </View>
        </TouchableOpacity>
      )}

      <TextPromptModal
        visible={folderModal}
        title="Nová složka"
        placeholder="Název složky"
        theme={theme}
        onSubmit={newFolder}
        onClose={() => setFolderModal(false)}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => { setMenuOpen(!menuOpen); setScannerMenuOpen(false); }}
      >
        {menuOpen ? <X size={26} color="white" /> : <List size={26} color="white" />}
      </TouchableOpacity>
    </View>
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

function MenuItem({ theme, Icon, color, label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: color }]}>
        <Icon size={20} color="white" />
      </View>
      <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  header: { fontSize: 22, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  productCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  productMain: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600' },
  productSub: { fontSize: 12, marginTop: 3 },
  qtyCol: { alignItems: 'flex-end' },
  qty: { fontSize: 18, fontWeight: '700' },
  lowRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  lowText: { fontSize: 11 },
  emptyCard: { alignItems: 'center', marginTop: 60, padding: 20, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 6 },
  emptyBtnText: { color: 'white', fontWeight: '700' },
  backdrop: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'flex-end' },
  menu: { borderRadius: 16, padding: 8, marginRight: 20, marginBottom: 96, minWidth: 270, elevation: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { marginLeft: 12, fontSize: 15 },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', elevation: 8,
  },
});