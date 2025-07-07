import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator } from 'lucide-react-native';

const sanitize = (val: string): number => {
  return parseFloat(val.replace(/,/g, '')) || 0;
};

export default function RentVsBuyScreen() {
  const [propertyPrice, setPropertyPrice] = useState('');
  const [downPaymentPercent, setDownPaymentPercent] = useState('20');
  const [interestRate, setInterestRate] = useState('4');
  const [loanTermYears, setLoanTermYears] = useState('25');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentGrowthRate, setRentGrowthRate] = useState('2.5');
  const [stayDuration, setStayDuration] = useState('10');
  const [investmentReturnRate, setInvestmentReturnRate] = useState('6');
  const [recommendation, setRecommendation] = useState('Enter values and calculate to see the result');
  const [result, setResult] = useState({ buyCost: null, rentCost: null });

  const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(value)) return '--';
    return value.toLocaleString('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  };

  const calculate = () => {
    const price = sanitize(propertyPrice);
    const downPct = sanitize(downPaymentPercent);
    const rate = sanitize(interestRate);
    const term = sanitize(loanTermYears);
    const rent = sanitize(monthlyRent);
    const rentGrowth = sanitize(rentGrowthRate);
    const stay = sanitize(stayDuration);
    const investReturn = sanitize(investmentReturnRate);

    if ([price, downPct, rate, term, rent, rentGrowth, stay, investReturn].some(v => isNaN(v) || v <= 0)) {
      Alert.alert('Input Error', 'All values must be positive numbers.');
      return;
    }

    const downPayment = price * (downPct / 100);
    const loanAmount = price - downPayment;
    const monthlyIntRate = rate / 100 / 12;
    const totalLoanPayments = term * 12;
    const stayPayments = Math.min(stay * 12, totalLoanPayments);

    let monthlyPayment = 0;
    let totalInterestPaid = 0;
    let remainingBalance = loanAmount;

    if (monthlyIntRate > 0) {
      monthlyPayment = loanAmount * monthlyIntRate / (1 - Math.pow(1 + monthlyIntRate, -totalLoanPayments));
      let balance = loanAmount;
      for (let month = 1; month <= stayPayments; month++) {
        const interestPayment = balance * monthlyIntRate;
        const principalPayment = monthlyPayment - interestPayment;
        totalInterestPaid += interestPayment;
        balance -= principalPayment;
      }
      remainingBalance = Math.max(0, balance);
    } else {
      const principalPaid = Math.min(loanAmount, (loanAmount / totalLoanPayments) * stayPayments);
      remainingBalance = loanAmount - principalPaid;
      monthlyPayment = loanAmount / totalLoanPayments;
      totalInterestPaid = 0;
    }

    const maintenance = price * 0.01 * stay; // 1% maintenance
    const propertyTax = price * 0.002 * stay; // 0.2% tax
    const closingCosts = price * 0.03; // 3% closing
    const futureValue = price * Math.pow(1 + 0.03, stay); // 3% appreciation
    const sellingCosts = futureValue * 0.02; // 2% selling
    const netSaleProceeds = futureValue - sellingCosts - remainingBalance;
    const totalCashOut = downPayment + totalInterestPaid + maintenance + propertyTax + closingCosts;
    const netGainBeforeOppCost = netSaleProceeds - totalCashOut;

    let rentTotal = 0, currRent = rent;
    for (let year = 0; year < stay; year++) {
      rentTotal += currRent * 12;
      currRent *= 1 + (rentGrowth / 100);
    }

    const r = Math.max(0, Math.min(15, investReturn)) / 100;
    const monthlyR = r / 12;
    const downPaymentOppCost = downPayment * (Math.pow(1 + r, stay) - 1);
    const surplus = Math.max(0, monthlyPayment - rent);
    let surplusGain = 0;
    if (surplus > 0) {
      surplusGain = r === 0 ? surplus * 12 * stay : surplus * ((Math.pow(1 + monthlyR, stay * 12) - 1) / monthlyR);
    }

    const effectiveBuy = downPaymentOppCost - netGainBeforeOppCost;
    const effectiveRent = rentTotal - surplusGain;
    setResult({ buyCost: effectiveBuy, rentCost: effectiveRent });

    const diff = Math.abs(effectiveBuy - effectiveRent);
    if (effectiveBuy < effectiveRent) {
      setRecommendation(`Buying saves ~€${diff.toFixed(0)} over ${stay} years`);
    } else {
      setRecommendation(`Renting saves ~€${diff.toFixed(0)} over ${stay} years`);
    }
  };

  const renderInput = (label: string, value: string, setter: (text: string) => void, placeholder: string) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setter}
        keyboardType="decimal-pad"
        style={styles.input}
        placeholder={placeholder}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Calculator size={28} color="#0F3460" />
            <Text style={styles.headerTitle}>Rent vs Buy Calculator</Text>
          </View>

          {renderInput('Property Price (€)', propertyPrice, setPropertyPrice, '300000')}
          {renderInput('Down Payment (%)', downPaymentPercent, setDownPaymentPercent, '20')}
          {renderInput('Interest Rate (%)', interestRate, setInterestRate, '4')}
          {renderInput('Loan Term (years)', loanTermYears, setLoanTermYears, '25')}
          {renderInput('Monthly Rent (€)', monthlyRent, setMonthlyRent, '1200')}
          {renderInput('Rent Growth Rate (%)', rentGrowthRate, setRentGrowthRate, '2.5')}
          {renderInput('Stay Duration (years)', stayDuration, setStayDuration, '10')}
          {renderInput('Investment Return (%)', investmentReturnRate, setInvestmentReturnRate, '6')}

          <TouchableOpacity style={styles.calculateButton} onPress={calculate}>
            <Text style={styles.calculateButtonText}>Calculate</Text>
          </TouchableOpacity>

          <View style={styles.resultsContainer}>
            <Text style={styles.resultLabel}>Net Cost of Buying:</Text>
            <Text style={styles.resultValue}>{formatCurrency(result.buyCost)}</Text>

            <Text style={styles.resultLabel}>Net Cost of Renting:</Text>
            <Text style={styles.resultValue}>{formatCurrency(result.rentCost)}</Text>

            <Text style={styles.recommendation}>{recommendation}</Text>
          </View>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerTitle}>Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              This estimate includes opportunity cost. Actual results depend on many personal and market factors. This tool does not constitute financial advice.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginLeft: 12, color: '#0F3460' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, backgroundColor: '#fff' },
  calculateButton: { backgroundColor: '#0F3460', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  calculateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resultsContainer: { marginTop: 30, alignItems: 'center' },
  resultLabel: { fontSize: 16, fontWeight: '500', color: '#0F3460' },
  resultValue: { fontSize: 20, fontWeight: 'bold', marginVertical: 6, color: '#0F3460' },
  recommendation: { fontSize: 16, fontWeight: '600', marginTop: 12, color: '#0F3460', textAlign: 'center' },
  disclaimer: { marginTop: 40, padding: 16, backgroundColor: '#f1f5f9', borderRadius: 8 },
  disclaimerTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#333' },
  disclaimerText: { fontSize: 12, color: '#555' },
});
