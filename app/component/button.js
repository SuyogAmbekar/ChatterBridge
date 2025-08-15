import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function Button({ label, onPress, variant='primary', style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, variant==='secondary'&&styles.secondary, style]}>
      <Text style={[styles.text, variant==='secondary'&&styles.secondaryText]}>{label}</Text>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  btn:{backgroundColor:'#111827',paddingVertical:12,paddingHorizontal:16,borderRadius:10,alignItems:'center',minWidth:120},
  text:{color:'#fff',fontWeight:'700'},
  secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D1D5DB'},
  secondaryText:{color:'#111827'}
});
