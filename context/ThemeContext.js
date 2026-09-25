import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

const lightColors = {
  primary: '#1e88e5',
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#1a1a1a',
  border: '#dddddd',
  notification: '#1e88e5',
  // naše vlastní doplňky
  subtext: '#888888',
  inputBg: '#ffffff',
  overlay: 'rgba(0,0,0,0.4)',
  danger: '#e53935',
  success: '#43a047',
};

const darkColors = {
  primary: '#64b5f6',
  background: '#121212',
  card: '#1e1e1e',
  text: '#f0f0f0',
  border: '#333333',
  notification: '#64b5f6',
  subtext: '#9e9e9e',
  inputBg: '#2a2a2a',
  overlay: 'rgba(0,0,0,0.6)',
  danger: '#ef5350',
  success: '#66bb6a',
};

// DŮLEŽITÉ: rozšiřujeme vestavěné motivy – tím zůstane zachovaná sekce `fonts`,
// kterou native-stack potřebuje (bez ní padalo "Cannot read property 'regular'")
export const lightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, ...lightColors },
};

export const darkTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, ...darkColors },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('darkMode');
      if (stored !== null) {
        setIsDark(stored === 'true');
      } else if (systemScheme) {
        setIsDark(systemScheme === 'dark');
      }
    })();
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      AsyncStorage.setItem('darkMode', String(!prev));
      return !prev;
    });
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}