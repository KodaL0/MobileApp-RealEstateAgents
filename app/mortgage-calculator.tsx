// app/mortgage-calculator.tsx

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function MortgageCalculator() {
  const insets = useSafeAreaInsets()

  const [propertyPrice, setPropertyPrice] = useState<string>('')
  const [downPaymentPercent, setDownPaymentPercent] = useState<string>('')
  const [loanTermYears, setLoanTermYears] = useState<string>('1')
  const [interestRate, setInterestRate] = useState<string>('')

  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null)
  const [totalPayment, setTotalPayment] = useState<number | null>(null)
  const [totalInterestPaid, setTotalInterestPaid] = useState<number | null>(null)

  // Recompute on any change
  useEffect(() => {
    calculateMortgage()
  }, [propertyPrice, downPaymentPercent, loanTermYears, interestRate])

  const calculateMortgage = () => {
    const priceNum = parseFloat(propertyPrice)
    const downPct = parseFloat(downPaymentPercent)
    const termYears = parseFloat(loanTermYears)
    const ratePct = parseFloat(interestRate)

    if (isNaN(priceNum) || priceNum <= 0) {
      setMonthlyPayment(null)
      setTotalPayment(null)
      setTotalInterestPaid(null)
      return
    }

    const downPctClamped = isNaN(downPct) ? 0 : Math.min(Math.max(downPct, 0), 100)
    const downPaymentAmount = priceNum * (downPctClamped / 100)
    const principal = priceNum - downPaymentAmount

    if (isNaN(termYears) || termYears <= 0) {
      setMonthlyPayment(0)
      setTotalPayment(principal)
      setTotalInterestPaid(0)
      return
    }
    const numberOfPayments = termYears * 12

    if (isNaN(ratePct) || ratePct <= 0) {
      const payment = principal / numberOfPayments
      setMonthlyPayment(payment)
      setTotalPayment(principal)
      setTotalInterestPaid(0)
      return
    }

    const monthlyRate = ratePct / 100 / 12
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)
    const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1

    if (denominator <= 0) {
      setMonthlyPayment(null)
      setTotalPayment(null)
      setTotalInterestPaid(null)
      return
    }

    const payment = (principal * numerator) / denominator
    const totalPaid = payment * numberOfPayments
    setMonthlyPayment(payment)
    setTotalPayment(totalPaid)
    setTotalInterestPaid(totalPaid - principal)
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(value)) return '--'
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // allow only digits + optional decimal
  const numericRegex = /^(\d*\.?\d*)$/

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mortgage Calculator</Text>

        {/* Property Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Property Price (€)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="300000"
            value={propertyPrice}
            onChangeText={val => {
              if (val === '' || numericRegex.test(val)) setPropertyPrice(val)
            }}
          />
        </View>

        {/* Down Payment (%) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Down Payment (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="20"
            value={downPaymentPercent}
            onChangeText={val => {
              if (!numericRegex.test(val) && val !== '') return
              if (val !== '' && parseFloat(val) > 100) {
                setDownPaymentPercent('100')
              } else {
                setDownPaymentPercent(val)
              }
            }}
          />
        </View>

        {/* Loan Term */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Loan Term (Years)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="30"
            value={loanTermYears}
            onChangeText={val => {
              if (val === '' || numericRegex.test(val)) setLoanTermYears(val)
            }}
          />
        </View>

        {/* Interest Rate */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Annual Interest Rate (%)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="4.25"
            value={interestRate}
            onChangeText={val => {
              if (val === '' || numericRegex.test(val)) setInterestRate(val)
            }}
          />
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultLabel}>Estimated Monthly Payment</Text>
          <Text style={styles.resultValue}>{formatCurrency(monthlyPayment)}</Text>

          <View style={styles.resultRow}>
            <View style={styles.resultBox}>
              <Text style={styles.resultBoxLabel}>Total Payment</Text>
              <Text style={styles.resultBoxValue}>{formatCurrency(totalPayment)}</Text>
            </View>
            <View style={styles.resultBox}>
              <Text style={styles.resultBoxLabel}>Total Interest</Text>
              <Text style={styles.resultBoxValue}>{formatCurrency(totalInterestPaid)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setPropertyPrice('')
              setDownPaymentPercent('')
              setLoanTermYears('1')
              setInterestRate('')
            }}
          >
            <Text style={styles.resetText}>Reset Calculator</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F3460',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  resultsContainer: { marginTop: 24, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 20 },
  resultLabel: { fontSize: 16, color: '#333', textAlign: 'center' },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F3460',
    textAlign: 'center',
    marginVertical: 12,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  resultBox: { flex: 1, alignItems: 'center' },
  resultBoxLabel: { fontSize: 12, color: '#555', marginBottom: 4 },
  resultBoxValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  resetButton: {
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  resetText: { color: '#0F3460', fontWeight: '600' },
})
