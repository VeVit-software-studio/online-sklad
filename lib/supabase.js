import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

let client = null;

export async function initSupabase() {
  const url = (await AsyncStorage.getItem('serverUrl')) || '';
  const key = (await AsyncStorage.getItem('apiKey')) || '';
  if (url && key) {
    client = createClient(url.replace(/\/+$/, ''), key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    client = null;
  }
  return !!client;
}

export function getSupabase() {
  return client;
}

export async function getActiveWarehouseId() {
  return AsyncStorage.getItem('activeWarehouseId');
}

export async function setActiveWarehouseId(id) {
  if (id) await AsyncStorage.setItem('activeWarehouseId', id);
  else await AsyncStorage.removeItem('activeWarehouseId');
}