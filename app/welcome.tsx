import { Link } from 'expo-router';
import { StyleSheet, Text, View, Image } from 'react-native';
import { theme } from './theme';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image source={require('../assets/images/react-logo.png')} style={styles.heroImage} resizeMode="contain" />
        <Text style={styles.title}>ChatterBridge</Text>
        <Text style={styles.subtitle}>Speak. See. Connect.</Text>
      </View>
      <Link href="/(tabs)" style={styles.button}>
        <Text style={styles.buttonText}>Get Started</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  heroImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.muted,
    marginBottom: 16,
  },
  button: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  buttonText: {
    color: theme.colors.secondaryText,
    fontSize: 18,
    fontWeight: '800',
  },
});
