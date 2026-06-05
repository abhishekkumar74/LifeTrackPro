import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';

export interface Country {
  name: string;
  code: string;
  flag: string;
  dialCode: string;
}

export const COUNTRIES: Country[] = [
  { name: 'India', code: 'IN', flag: '🇮🇳', dialCode: '+91' },
  { name: 'United States', code: 'US', flag: '🇺🇸', dialCode: '+1' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', dialCode: '+44' },
  { name: 'Singapore', code: 'SG', flag: '🇸🇬', dialCode: '+65' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪', dialCode: '+971' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦', dialCode: '+1' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', dialCode: '+61' },
];

interface CountryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
}

export const CountryPicker: React.FC<CountryPickerProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const renderItem = ({ item }: { item: Country }): React.JSX.Element => (
    <Pressable
      style={({ pressed }) => [
        styles.countryItem,
        pressed && styles.countryItemPressed,
      ]}
      onPress={() => {
        onSelect(item);
        onClose();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Select ${item.name} code ${item.dialCode}`}
    >
      <Text style={styles.flag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.dialCode}>{item.dialCode}</Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.headerTitle}>Select Country</Text>
          </View>

          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Pressable>
    </Modal>
  );
};

const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 42, 0.4)', // Mapped to primary navy transparency
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: screenHeight * 0.6,
    paddingBottom: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    color: COLORS.t1,
  },
  listContent: {
    paddingHorizontal: SPACING.xxl,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    minHeight: 48, // Touch target standard
  },
  countryItemPressed: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.sm,
  },
  flag: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  countryName: {
    fontFamily: TYPOGRAPHY.fonts.sans,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.t1,
    flex: 1,
  },
  dialCode: {
    fontFamily: TYPOGRAPHY.fonts.mono,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.t2,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});

export default CountryPicker;
