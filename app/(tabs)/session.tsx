import { Text, View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function SessionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Session</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: '800', color: theme.colors.primary, textAlign: 'center' },
});
