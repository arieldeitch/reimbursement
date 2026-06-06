import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export function DateField({ label, value, onChange, containerStyle }: Props) {
  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 16,
          color: '#111',
          backgroundColor: '#fafafa',
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          outline: 'none',
          display: 'block',
        } as React.CSSProperties}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
