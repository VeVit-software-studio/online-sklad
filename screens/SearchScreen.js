import { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Search, Package } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { initSupabase, getSupabase, getActiveWarehouseId } from '../lib/supabase';

export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (t) => {
    setLoading(true);
    await initSupabase();
    const whId = await getActiveWarehouseId();
    const q = t.replace(/%/g, '');
    const { data } = await getSupabase().from('products')
      .select('*').eq('warehouse_id', whId)
      .or(`name.ilike.%${q}%,barcode.ilike.%${q}%`)
      .order('name').limit(50);
    setResults(data || []);
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={[styles.searchRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Search size={20} color={theme.colors.subtext} />
          <TextInput
            style={{ flex: 1, color: theme.colors.text, fontSize: 16 }}
            placeholder="Název nebo čárový kód…"
            placeholderTextColor={theme.colors.subtext}
            value={text}
            autoFocus
            onChangeText={(t) => {
              setText(t);
              if (t.trim().length >= 2) search(t.trim());
              else setResults(null);
            }}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={results || []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            results && (
              <View style={styles.empty}>
                <Package size={40} color={theme.colors.subtext} />
                <Text style={{ color: theme.colors.subtext, marginTop: 8 }}>Nic nenalezeno</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.colors.card }]}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: theme.colors.subtext, fontSize: 12, marginTop: 2 }}>{item.barcode || 'bez kódu'}</Text>
              </View>
              <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '700' }}>
                {Number(item.quantity)} {item.unit}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  empty: { alignItems: 'center', marginTop: 40 },
});