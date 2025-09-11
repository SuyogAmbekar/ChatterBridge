import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Button({ label, onPress, variant='primary', style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[
      styles.btn,
      variant==='secondary'&&styles.secondary,
      variant==='accent'&&styles.accent,
      style
    ]}>
      <Text style={[
        styles.text,
        variant==='secondary'&&styles.secondaryText
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  btn:{
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minWidth: 140,
  },
  text:{color: theme.colors.primaryText,fontWeight:'700',fontSize:16},
  secondary:{backgroundColor:'#fff',borderWidth:1,borderColor: theme.colors.border},
  secondaryText:{color: theme.colors.primary},
  accent:{backgroundColor: theme.colors.accent}
});
