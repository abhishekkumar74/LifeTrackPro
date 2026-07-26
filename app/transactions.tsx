import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Wallet,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { parseSmsText } from '@/lib/services/sms-parser';
import { parseInvoiceImage, parseStatementFile } from '@/lib/services/statement-parser';

const { width } = Dimensions.get('window');
const BG_COLOR = '#F7F6F3';
const ACCENT_COLOR = '#5B4FE8';

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  merchant: string;
  category: string;
  date: string;
  time: string;
  source: 'manual' | 'sms' | 'screenshot' | 'invoice' | 'statement';
}

export default function TransactionsScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals visibility
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [parsingLoaderVisible, setParsingLoaderVisible] = useState(false);
  const [parsingMessage, setParsingMessage] = useState('');

  // Form states
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Others');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [smsText, setSmsText] = useState('');

  const categories = [
    'Food & Dining',
    'Transport',
    'Shopping',
    'Utilities & Bills',
    'Entertainment',
    'Health & Fitness',
    'Investment',
    'Others'
  ];

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Save transaction to DB
  const saveTransaction = async (tx: Omit<Transaction, 'id'>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: tx.amount,
          type: tx.type,
          merchant: tx.merchant,
          category: tx.category,
          date: tx.date,
          time: tx.time,
          source: tx.source
        });

      if (error) throw error;
      await fetchTransactions();
    } catch (e: any) {
      Alert.alert('Save Error', e.message || 'Failed to save transaction');
    }
  };

  // 1. Manual Transaction Add
  const handleAddManual = async () => {
    if (!amount || !merchant) {
      Alert.alert('Validation', 'Please provide amount and merchant');
      return;
    }

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      Alert.alert('Validation', 'Please provide a valid amount');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().split(' ')[0];

    setIsLoading(true);
    await saveTransaction({
      amount: value,
      type,
      merchant,
      category,
      date: today,
      time: timeNow,
      source: 'manual'
    });
    setIsLoading(false);
    setManualModalVisible(false);
    // Clear form
    setAmount('');
    setMerchant('');
    setCategory('Others');
    setType('expense');
  };

  // 2. Paste SMS and Parse
  const handleParseSms = async () => {
    if (!smsText.trim()) {
      Alert.alert('Validation', 'Please paste transaction SMS text first.');
      return;
    }

    setSmsModalVisible(false);
    setParsingMessage('AI is parsing transaction SMS...');
    setParsingLoaderVisible(true);

    try {
      const parsed = await parseSmsText(smsText);
      setParsingLoaderVisible(false);

      // Confirm before saving
      Alert.alert(
        'Verify Transaction',
        `Details Found:\n\nMerchant: ${parsed.merchant}\nAmount: ₹${parsed.amount}\nType: ${parsed.type}\nCategory: ${parsed.category}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Expense',
            onPress: async () => {
              setIsLoading(true);
              await saveTransaction({
                ...parsed,
                source: 'sms'
              });
              setIsLoading(false);
              setSmsText('');
            }
          }
        ]
      );
    } catch (e: any) {
      setParsingLoaderVisible(false);
      Alert.alert('Parsing Failed', 'AI could not resolve SMS details. Please enter manually.');
    }
  };

  // 3. Scan Screenshot or Receipt (Image Picker)
  const handleScanReceipt = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Library permission is needed to scan transaction receipt screenshots.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });

    if (pickerResult.canceled) return;

    const selectedAsset = pickerResult.assets[0];
    setParsingMessage('AI is reading payment screenshot details...');
    setParsingLoaderVisible(true);

    try {
      // Fetch base64 representation of image
      const response = await fetch(selectedAsset.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const mimeType = selectedAsset.mimeType || 'image/png';
        
        try {
          const parsed = await parseInvoiceImage(selectedAsset.uri, mimeType);
          setParsingLoaderVisible(false);

          Alert.alert(
            'Confirm Screenshot Extraction',
            `Merchant: ${parsed.merchant}\nAmount: ₹${parsed.amount}\nCategory: ${parsed.category}`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm & Save',
                onPress: async () => {
                  setIsLoading(true);
                  await saveTransaction({
                    ...parsed,
                    source: 'screenshot'
                  });
                  setIsLoading(false);
                }
              }
            ]
          );
        } catch (innerErr) {
          setParsingLoaderVisible(false);
          Alert.alert('Parsing Failed', 'Failed to extract screenshot details with AI.');
        }
      };

      reader.readAsDataURL(blob);
    } catch (e: any) {
      setParsingLoaderVisible(false);
      Alert.alert('Error', 'Failed to load selected image file.');
    }
  };

  // 4. Upload Statement PDF/CSV
  const handleUploadStatement = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/csv', 'text/comma-separated-values'],
        copyToCacheDirectory: true
      });

      if (pickerResult.canceled) return;

      const selectedFile = pickerResult.assets[0];
      setParsingMessage('AI is parsing statement transactions...');
      setParsingLoaderVisible(true);

      const parsedTransactions = await parseStatementFile(selectedFile.uri);
      setParsingLoaderVisible(false);

      if (parsedTransactions.length === 0) {
        Alert.alert('No Transactions', 'AI could not detect any transactions in this statement.');
        return;
      }

      Alert.alert(
        'Statement Extracted',
        `AI successfully extracted ${parsedTransactions.length} transactions from the statement. Do you want to bulk import them?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import All',
            onPress: async () => {
              setIsLoading(true);
              for (const tx of parsedTransactions) {
                await saveTransaction({
                  ...tx,
                  source: 'statement'
                });
              }
              setIsLoading(false);
              Alert.alert('Success', `Imported ${parsedTransactions.length} transactions successfully!`);
            }
          }
        ]
      );
    } catch (e: any) {
      setParsingLoaderVisible(false);
      if (e.message === 'PASSWORD_PROTECTED') {
        Alert.alert(
          'Protected PDF',
          'Password-protected statements cannot be parsed. Please select a decrypted/unencrypted statement PDF.'
        );
      } else {
        Alert.alert('Upload Error', 'Failed to process the statement file.');
      }
    }
  };

  // Calculated Financial Metrics
  const metrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: { [key: string]: number } = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amt;
      }
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      categories: categoryTotals
    };
  }, [transactions]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pulse Ledger</Text>
        <TouchableOpacity onPress={() => setManualModalVisible(true)} style={styles.addButton}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={ACCENT_COLOR} />
        }
      >
        {/* Wallet Overview Box */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Wallet size={20} color="#E0DDFF" />
            <Text style={styles.walletLabel}>NET BALANCE</Text>
          </View>
          <Text style={styles.walletBalance}>₹{metrics.balance.toLocaleString()}</Text>

          <View style={styles.walletDetails}>
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(52, 199, 89, 0.2)' }]}>
                <TrendingUp size={14} color="#34C759" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Income</Text>
                <Text style={[styles.detailValue, { color: '#34C759' }]}>₹{metrics.income.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.walletDivider} />

            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(255, 59, 48, 0.2)' }]}>
                <TrendingDown size={14} color="#FF3B30" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Expenses</Text>
                <Text style={[styles.detailValue, { color: '#FF3B30' }]}>₹{metrics.expense.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Action Triggers */}
        <Text style={styles.sectionTitle}>AI Scanner Toolkit</Text>
        <View style={styles.scannerRow}>
          <TouchableOpacity onPress={handleScanReceipt} style={styles.scannerButton} activeOpacity={0.8}>
            <View style={[styles.scannerIconWrapper, { backgroundColor: '#E0EEFF' }]}>
              <ImageIcon size={20} color="#007AFF" />
            </View>
            <Text style={styles.scannerText}>Scan Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSmsModalVisible(true)} style={styles.scannerButton} activeOpacity={0.8}>
            <View style={[styles.scannerIconWrapper, { backgroundColor: '#E5FFEA' }]}>
              <MessageSquare size={20} color="#34C759" />
            </View>
            <Text style={styles.scannerText}>Paste SMS</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleUploadStatement} style={styles.scannerButton} activeOpacity={0.8}>
            <View style={[styles.scannerIconWrapper, { backgroundColor: '#FFEBEA' }]}>
              <FileText size={20} color="#FF3B30" />
            </View>
            <Text style={styles.scannerText}>Upload PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Category Breakdown (Simple Progress Bars) */}
        {Object.keys(metrics.categories).length > 0 && (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryCardTitle}>Category Breakdown</Text>
            {Object.entries(metrics.categories).map(([cat, total]) => {
              const percentage = metrics.expense > 0 ? (total / metrics.expense) * 100 : 0;
              return (
                <View key={cat} style={styles.categoryRow}>
                  <View style={styles.categoryTextRow}>
                    <Text style={styles.categoryName}>{cat}</Text>
                    <Text style={styles.categoryAmt}>₹{total.toLocaleString()} ({percentage.toFixed(0)}%)</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Transactions List */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {transactions.length > 0 ? (
          <View style={styles.listContainer}>
            {transactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <View key={tx.id} style={styles.txItem}>
                  <View style={[styles.txTypeIcon, { backgroundColor: isIncome ? '#E2FBE7' : '#FFEBEA' }]}>
                    {isIncome ? (
                      <ArrowDownLeft size={16} color="#34C759" />
                    ) : (
                      <ArrowUpRight size={16} color="#FF3B30" />
                    )}
                  </View>

                  <View style={styles.txInfo}>
                    <Text style={styles.txMerchant} numberOfLines={1}>{tx.merchant}</Text>
                    <View style={styles.txMeta}>
                      <Text style={styles.txCategory}>{tx.category}</Text>
                      <Text style={styles.txSeparator}>•</Text>
                      <Text style={styles.txDate}>{tx.date}</Text>
                    </View>
                  </View>

                  <View style={styles.txAmountContainer}>
                    <Text style={[styles.txAmount, { color: isIncome ? '#34C759' : '#17172A' }]}>
                      {isIncome ? '+' : '-'} ₹{Number(tx.amount).toLocaleString()}
                    </Text>
                    <Text style={styles.txSourceBadge}>{tx.source.toUpperCase()}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions logged yet.</Text>
            <Text style={styles.emptySubtext}>Use the scanner toolkit above to instantly populate transactions from invoices, statements, or SMS.</Text>
          </View>
        )}
      </ScrollView>

      {/* Parsing Loader Modal */}
      <Modal visible={parsingLoaderVisible} transparent animationType="fade">
        <View style={styles.loaderModalContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={ACCENT_COLOR} />
            <Text style={styles.loaderMessage}>{parsingMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Manual Add Modal */}
      <Modal visible={manualModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Transaction</Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                <X size={20} color="#5C5C70" />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                onPress={() => setType('expense')}
                style={[styles.typeButton, type === 'expense' && styles.typeButtonExpenseActive]}
              >
                <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>Expense</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setType('income')}
                style={[styles.typeButton, type === 'income' && styles.typeButtonIncomeActive]}
              >
                <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>Income</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.modalInput}
            />

            <TextInput
              placeholder="Merchant / From"
              value={merchant}
              onChangeText={setMerchant}
              style={styles.modalInput}
            />

            {/* Category Dropdown representation */}
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categorySelectorGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.catOption, category === cat && styles.catOptionSelected]}
                >
                  <Text style={[styles.catOptionText, category === cat && styles.catOptionTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleAddManual} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SMS Paste Modal */}
      <Modal visible={smsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paste Bank SMS</Text>
              <TouchableOpacity onPress={() => setSmsModalVisible(false)}>
                <X size={20} color="#5C5C70" />
              </TouchableOpacity>
            </View>

            <Text style={styles.smsInstruction}>
              Paste the transaction SMS received from Google Pay, PhonePe, or your bank. AI will auto-extract details.
            </Text>

            <TextInput
              placeholder="Paste SMS text here..."
              value={smsText}
              onChangeText={setSmsText}
              multiline
              numberOfLines={4}
              style={[styles.modalInput, { height: 120, textAlignVertical: 'top' }]}
            />

            <TouchableOpacity onPress={handleParseSms} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Parse with Gemini AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG_COLOR
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E7E3'
  },
  backButton: {
    paddingVertical: 6
  },
  backText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70'
  },
  headerTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#17172A',
    fontWeight: '700'
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: ACCENT_COLOR,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    padding: 16,
    paddingBottom: 40
  },
  walletCard: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 16,
    padding: 20,
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  walletLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    color: '#E0DDFF',
    marginLeft: 8,
    fontWeight: '600',
    letterSpacing: 1
  },
  walletBalance: {
    fontFamily: 'DMSans-Bold',
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 16
  },
  walletDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  detailLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#E0DDFF'
  },
  detailValue: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    fontWeight: '700'
  },
  walletDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12
  },
  sectionTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    color: '#17172A',
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8
  },
  scannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  scannerButton: {
    width: (width - 48) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  scannerIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  scannerText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: '#17172A',
    fontWeight: '600'
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  categoryCardTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '700',
    marginBottom: 12
  },
  categoryRow: {
    marginBottom: 12
  },
  categoryTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  categoryName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70'
  },
  categoryAmt: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#17172A',
    fontWeight: '700'
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F0EC',
    borderRadius: 3,
    width: '100%'
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT_COLOR
  },
  listContainer: {
    width: '100%'
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  txTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  txInfo: {
    flex: 1
  },
  txMerchant: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600'
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  txCategory: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF'
  },
  txSeparator: {
    fontSize: 10,
    color: '#9B9BAF',
    marginHorizontal: 4
  },
  txDate: {
    fontFamily: 'DMSans',
    fontSize: 10,
    color: '#9B9BAF'
  },
  txAmountContainer: {
    alignItems: 'flex-end'
  },
  txAmount: {
    fontFamily: 'DMSans-Bold',
    fontSize: 14,
    fontWeight: '700'
  },
  txSourceBadge: {
    fontSize: 8,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#9B9BAF',
    marginTop: 2
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
  },
  emptyText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#5C5C70',
    fontWeight: '600',
    marginBottom: 6
  },
  emptySubtext: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    textAlign: 'center',
    lineHeight: 16
  },
  loaderModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: width * 0.8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  loaderMessage: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#17172A',
    fontWeight: '600',
    marginTop: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: 15,
    color: '#17172A',
    fontWeight: '700'
  },
  typeSelectorRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 8
  },
  typeButtonExpenseActive: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFEBEA'
  },
  typeButtonIncomeActive: {
    borderColor: '#34C759',
    backgroundColor: '#E2FBE7'
  },
  typeButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#5C5C70'
  },
  typeButtonTextActive: {
    fontWeight: '600'
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: '#FBFBFA'
  },
  inputLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#5C5C70',
    marginBottom: 8
  },
  categorySelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20
  },
  catOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E8E7E3',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  catOptionSelected: {
    borderColor: ACCENT_COLOR,
    backgroundColor: 'rgba(91, 79, 232, 0.1)'
  },
  catOptionText: {
    fontSize: 11,
    color: '#5C5C70'
  },
  catOptionTextSelected: {
    color: ACCENT_COLOR,
    fontWeight: '600'
  },
  saveBtn: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  saveBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700'
  },
  smsInstruction: {
    fontFamily: 'DMSans',
    fontSize: 11,
    color: '#9B9BAF',
    lineHeight: 16,
    marginBottom: 12
  }
});
