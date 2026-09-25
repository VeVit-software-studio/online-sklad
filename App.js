import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Settings } from 'lucide-react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import HomeScreen from './screens/HomeScreen';
import ScannerScreen from './screens/ScannerScreen';
import SettingsScreen from './screens/SettingsScreen';
import AddProductScreen from './screens/AddProductScreen';
import SearchScreen from './screens/SearchScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import WarehouseScreen from './screens/WarehouseScreen';

const Stack = createNativeStackNavigator();

function Navigation() {
  const { theme } = useTheme();

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { color: theme.colors.text },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: 'Sklad',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginRight: 8 }}>
                <Settings size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Skenování' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Nastavení' }} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Nový produkt' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Hledání' }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Detail produktu' }} />
        <Stack.Screen name="Warehouse" component={WarehouseScreen} options={{ title: 'Sklady a složky' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Navigation />
    </ThemeProvider>
  );
}