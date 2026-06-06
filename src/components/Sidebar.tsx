import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const NAV_ITEMS = [
  { label: 'Dashboard',  href: '/' },
  { label: 'Expenses',   href: '/expenses' },
  { label: 'Trips',      href: '/trips' },
  { label: 'Import CSV', href: '/import-csv' },
] as const;

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings' },
  { label: 'About',    href: '/about' },
] as const;

type AnyHref = (typeof NAV_ITEMS)[number]['href'] | (typeof BOTTOM_ITEMS)[number]['href'];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: AnyHref): boolean {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <View style={styles.sidebar}>
      <Text style={styles.brand}>Reimbursement</Text>

      <Pressable
        style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        onPress={() => router.push('/add-expense')}
      >
        <Text style={styles.addBtnText}>+ Add Expense</Text>
      </Pressable>

      {NAV_ITEMS.map(({ label, href }) => {
        const active = isActive(href);
        return (
          <Pressable
            key={href}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => router.push(href)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}

      <View style={styles.spacer} />

      {BOTTOM_ITEMS.map(({ label, href }) => {
        const active = isActive(href);
        return (
          <Pressable
            key={href}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => router.push(href)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: '#1E293B',
    paddingTop: 40,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  spacer: {
    flex: 1,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  addBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  addBtnPressed: {
    backgroundColor: '#1D4ED8',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  item: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: '#2563EB',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
