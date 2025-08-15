import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Header({ title, right }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header:{paddingHorizontal:16,paddingVertical:12,backgroundColor:'#fff',
    borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#E5E7EB',
    flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  title:{fontSize:18,fontWeight:'700'}
});
