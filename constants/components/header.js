import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../../constants/theme';

export default function Header({ title, right }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header:{
    paddingHorizontal:16,paddingVertical:14,backgroundColor: theme.colors.surface,
    borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor: theme.colors.border,
    flexDirection:'row',alignItems:'center',justifyContent:'space-between'
  },
  title:{fontSize:20,fontWeight:'800',color: theme.colors.primary}
});
