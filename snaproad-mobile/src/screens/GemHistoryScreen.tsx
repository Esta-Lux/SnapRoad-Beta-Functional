// SnapRoad Mobile - Gem History Screen (matches /driver web GemHistory modal)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, BorderRadius } from '../utils/theme';
import { useUserStore } from '../store';

interface GemTransaction {
  id: number;
  type: 'earned' | 'spent' | 'bonus';
  amount: number;
  description: string;
  date: string;
  category: string;
}

export const GemHistoryScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'earned' | 'spent'>('all');
  const [transactions, setTransactions] = useState<GemTransaction[]>([]);

  useEffect(() => {
    // Mock data
    setTransactions([
      { id: 1, type: 'earned', amount: 45, description: 'Trip completed - 12.4 mi', date: 'Today, 2:30 PM', category: 'trip' },
      { id: 2, type: 'earned', amount: 100, description: 'Safe driving bonus', date: 'Today, 2:30 PM', category: 'bonus' },
      { id: 3, type: 'spent', amount: -500, description: 'Unlocked Ocean Blue color', date: 'Today, 11:00 AM', category: 'purchase' },
      { id: 4, type: 'earned', amount: 15, description: 'Trip completed - 3.2 mi', date: 'Today, 9:15 AM', category: 'trip' },
      { id: 5, type: 'earned', amount: 250, description: 'Challenge completed', date: 'Yesterday', category: 'challenge' },
      { id: 6, type: 'earned', amount: 38, description: 'Trip completed - 12.8 mi', date: 'Yesterday', category: 'trip' },
      { id: 7, type: 'bonus', amount: 500, description: 'Weekly streak bonus', date: 'Yesterday', category: 'bonus' },
      { id: 8, type: 'earned', amount: 75, description: 'Offer redeemed - Shell Gas', date: '2 days ago', category: 'offer' },
      { id: 9, type: 'spent', amount: -200, description: 'Unlocked Racing Red color', date: '3 days ago', category: 'purchase' },
    ]);
  }, []);

  const filteredTransactions = transactions.filter(t => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'earned') return t.type === 'earned' || t.type === 'bonus';
    return t.type === 'spent';
  });

  const totalEarned = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

  const getIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'trip': return 'car';
      case 'bonus': return 'star';
      case 'challenge': return 'flash';
      case 'offer': return 'gift';
      case 'purchase': return 'cart';
      default: return 'diamond';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'earned': return '#22C55E';
      case 'bonus': return '#F59E0B';
      case 'spent': return '#EF4444';
      default: return Colors.primary;
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient colors={['#0EA5E9', '#0284C7']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Gem History</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* Balance Card */}
        <View style={s.balanceCard}>
          <View style={s.balanceMain}>
            <Ionicons name="diamond" size={28} color="#fff" />
            <Text style={s.balanceValue}>{(user?.gems || 2450).toLocaleString()}</Text>
          </View>
          <Text style={s.balanceLabel}>Current Balance</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Ionicons name="trending-up" size={18} color="#22C55E" />
            <Text style={s.statValue}>+{totalEarned.toLocaleString()}</Text>
            <Text style={s.statLabel}>This Month</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="trending-down" size={18} color="#EF4444" />
            <Text style={s.statValue}>-{totalSpent.toLocaleString()}</Text>
            <Text style={s.statLabel}>Spent</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {(['all', 'earned', 'spent'] as const).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[s.filterBtn, activeFilter === filter && s.filterBtnActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[s.filterText, activeFilter === filter && s.filterTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {filteredTransactions.map(transaction => (
          <View key={transaction.id} style={s.transactionCard}>
            <View style={[s.transactionIcon, { backgroundColor: `${getColor(transaction.type)}15` }]}>
              <Ionicons name={getIcon(transaction.category)} size={18} color={getColor(transaction.type)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.transactionDesc}>{transaction.description}</Text>
              <Text style={s.transactionDate}>{transaction.date}</Text>
            </View>
            <Text style={[s.transactionAmount, { color: getColor(transaction.type) }]}>
              {transaction.amount > 0 ? '+' : ''}{transaction.amount}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  balanceCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 20, marginBottom: 12 },
  balanceMain: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: FontWeights.bold },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.sm, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginTop: 4 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.xs },
  // Filter
  filterRow: { flexDirection: 'row', padding: 16, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.surface },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  filterTextActive: { color: '#fff' },
  // Transaction card
  transactionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.glassBorder },
  transactionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  transactionDesc: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  transactionDate: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  transactionAmount: { fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});

export default GemHistoryScreen;
