import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';

export default function MortgageCalculatorScreen() {
  const [propertyPrice, setPropertyPrice] = useState('');
  const [downPaymentPercent, setDownPaymentPercent] = useState('');
  const [loanTermYears, setLoanTermYears] = useState('1');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [totalPayment, setTotalPayment] = useState<number | null>(null);
  const [totalInterestPaid, setTotalInterestPaid] = useState<number | null>(null);

  useEffect(() => {
    calculateMortgage();
  }, [propertyPrice, downPaymentPercent, loanTermYears, interestRate]);

  const calculateMortgage = () => {
    const priceNum = parseFloat(propertyPrice);
    const downPct = parseFloat(downPaymentPercent);
    const termYears = parseFloat(loanTermYears);
    const ratePct = parseFloat(interestRate);

    if (isNaN(priceNum) || priceNum <= 0) {
      setMonthlyPayment(null);
      setTotalPayment(null);
      setTotalInterestPaid(null);
      return;
    }

    const downPctClamped = isNaN(downPct) ? 0 : Math.min(Math.max(downPct, 0), 100);
    const downPaymentAmount = priceNum * (downPctClamped / 100);
    const principal = priceNum - downPaymentAmount;

    if (isNaN(termYears) || termYears <= 0) {
      setMonthlyPayment(0);
      setTotalPayment(principal);
      setTotalInterestPaid(0);
      return;
    }

    const numberOfPayments = termYears * 12;

    if (isNaN(ratePct) || ratePct <= 0) {
      const payment = principal / numberOfPayments;
      setMonthlyPayment(payment);
      setTotalPayment(principal);
      setTotalInterestPaid(0);
      return;
    }

    const monthlyRate = ratePct / 100 / 12;
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
    const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;

    if (denominator <= 0) {
      setMonthlyPayment(null);
      setTotalPayment(null);
      setTotalInterestPaid(null);
      return;
    }

    const payment = principal * (numerator / denominator);
    const totalPaid = payment * numberOfPayments;
    setMonthlyPayment(payment);
    setTotalPayment(totalPaid);
    setTotalInterestPaid(totalPaid - principal);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(value)) return '--';
    return value.toLocaleString('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
  };

  const reset = () => {
    setPropertyPrice('');
    setDownPaymentPercent('');
    setLoanTermYears('1');
    setInterestRate('');
  };

  const renderInput = (label: string, value: string, setter: (text: string) => void, placeholder: string, suffix?: string) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          value={value}
          onChangeText={setter}
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Mortgage Calculator</Text>

          {renderInput('Property Price (€)', propertyPrice, setPropertyPrice, '300000')}
          {renderInput('Down Payment (%)', downPaymentPercent, setDownPaymentPercent, '20', '%')}
          {renderInput('Loan Term (Years)', loanTermYears, setLoanTermYears, '30')}
          {renderInput('Annual Interest Rate (%)', interestRate, setInterestRate, '4.25', '%')}

          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Estimated Monthly Payment</Text>
            <Text style={styles.resultMain}>{formatCurrency(monthlyPayment)}</Text>
            <Text style={styles.resultHint}>(Principal & Interest)</Text>

            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultSmallLabel}>Total Payment</Text>
                <Text style={styles.resultValue}>{formatCurrency(totalPayment)}</Text>
              </View>
              <View style={styles.resultItem}>
                <Text style={styles.resultSmallLabel}>Total Interest Paid</Text>
                <Text style={styles.resultValue}>{formatCurrency(totalInterestPaid)}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetButtonText}>Reset Calculator</Text>
          </TouchableOpacity>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerTitle}>Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              Estimates do not include taxes, insurance, or HOA fees. This tool is for informational purposes only and does not constitute financial advice.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#0F3460', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff' },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
  inputSuffix: { paddingHorizontal: 12, fontSize: 16, color: '#555' },
  resultContainer: { marginTop: 30, alignItems: 'center' },
  resultLabel: { fontSize: 16, fontWeight: '500', color: '#0F3460' },
  resultMain: { fontSize: 26, fontWeight: 'bold', marginVertical: 8, color: '#0F3460' },
  resultHint: { fontSize: 12, color: '#555' },
  resultGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, width: '100%' },
  resultItem: { flex: 1, alignItems: 'center' },
  resultSmallLabel: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 4 },
  resultValue: { fontSize: 16, fontWeight: 'bold', color: '#0F3460' },
  resetButton: { marginTop: 30, backgroundColor: '#0F3460', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  resetButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disclaimer: { marginTop: 40, padding: 16, backgroundColor: '#f1f5f9', borderRadius: 8 },
  disclaimerTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#333' },
  disclaimerText: { fontSize: 12, color: '#555' },
});
