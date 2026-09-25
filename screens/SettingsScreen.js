import { useEffect, useState } from 'react';
import {
  View, Text, Switch, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const APP_VERSION = '0.1.0';

export default function SettingsScreen() {
  const { isDark, toggleTheme, theme } = useTheme();
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);

  // Načti uložené hodnoty
  useEffect(() => {
    (async () => {
      setServerUrl((await AsyncStorage.getItem('serverUrl')) || '');
      setApiKey((await AsyncStorage.getItem('apiKey')) || '');
    })();
  }, []);

  const saveConnection = async () => {
    await AsyncStorage.setItem('serverUrl', serverUrl.trim());
    await AsyncStorage.setItem('apiKey', apiKey.trim());
    Alert.alert('Uloženo', 'Nastavení připojení bylo uloženo.');
  };

  const testConnection = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) {
      Alert.alert('Chyba', 'Nejdřív vyplň URL i API klíč.');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(
        `${serverUrl.trim().replace(/\/+$/, '')}/rest/v1/`,
        { headers: { apikey: apiKey.trim() } }
      );
      if (res.ok) {
        Alert.alert('✅ Funguje', 'Server odpověděl – připojení je v pořádku.');
      } else {
        Alert.alert('⚠️ Problém', `Server odpověděl kódem ${res.status}. Zkontroluj klíč.`);
      }
    } catch {
      Alert.alert('❌ Nelze se připojit', 'Zkontroluj URL adresu a připojení k internetu.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>

      <Text style={[styles.sectionTitle, { color: theme.colors.subtext }]}>VZHLED</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.row}>
          <Ionicons name="moon-outline" size={22} color={theme.colors.primary} />
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Tmavý režim</Text>
            <Text style={[styles.hint, { color: theme.colors.subtext }]}>Ztmaví celou aplikaci</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.subtext }]}>DATABÁZE / SERVER</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.label, { color: theme.colors.text, marginBottom: 4 }]}>Adresa serveru (Supabase URL)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="https://xxxxxxxx.supabase.co"
          placeholderTextColor={theme.colors.subtext}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={[styles.label, { color: theme.colors.text, marginBottom: 4, marginTop: 12 }]}>API klíč (anon public)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="eyJhbGciOiJI..."
          placeholderTextColor={theme.colors.subtext}
          value={apiKey}
          onChangeText={setApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={saveConnection}>
            <Text style={styles.buttonText}>Uložit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineButton, { borderColor: theme.colors.primary }]}
            onPress={testConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>Test připojení</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.subtext }]}>O APLIKACI</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.label, { color: theme.colors.text, marginLeft: 12 }]}>Sklad – verze {APP_VERSION}</Text>
        </View>
        <View style={[styles.row, { marginTop: 10 }]}>
          <Ionicons name="server-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.label, { color: theme.colors.text, marginLeft: 12 }]}>
            Server: {serverUrl ? 'nastaven' : 'nenastaven'}
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginVertical: 8, marginLeft: 4 },
  card: { borderRadius: 14, padding: 16, marginBottom: 8, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, marginLeft: 12 },
  label: { fontSize: 16 },
  hint: { fontSize: 12, marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', flex: 1 },
  buttonText: { color: 'white', fontWeight: '700' },
  outlineButton: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center', flex: 1 },
  outlineButtonText: { fontWeight: '700' },
});