import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useUser } from './UserContext';
import { login as apiLogin } from './middleware';
import apiService from '@/config/api';

interface NativeLoginProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialMode?: 'login' | 'register';
  hideToggle?: boolean;
}

export const NativeLogin: React.FC<NativeLoginProps> = ({
  onSuccess,
  onCancel,
  initialMode = 'login',
  hideToggle = false,
}) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    password2: '',
    acceptedTerms: false,
    acceptedPrivacy: false,
    marketingConsent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login: contextLogin, setUser, refreshUser } = useUser();

  const handleInputChange = (field: string, value: string | boolean) => {
    // Special case: When accepting Terms, also accept Privacy Policy
    if (field === 'acceptedTerms' && typeof value === 'boolean') {
      setFormData(prev => ({
        ...prev,
        acceptedTerms: value,
        acceptedPrivacy: value,
      }));
      if (errors.acceptedTerms || errors.acceptedPrivacy) {
        setErrors(prev => ({
          ...prev,
          acceptedTerms: '',
          acceptedPrivacy: '',
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Min 8 characters';
    }

    if (!isLogin) {
      if (!formData.username) {
        newErrors.username = 'Username required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Min 3 characters';
      }

      if (!formData.password2) {
        newErrors.password2 = 'Confirm password';
      } else if (formData.password !== formData.password2) {
        newErrors.password2 = "Passwords don't match";
      }

      // Legal documents acceptance (REQUIRED)
      if (!formData.acceptedTerms) {
        newErrors.acceptedTerms = 'You must accept the Terms & Conditions';
      }

      if (!formData.acceptedPrivacy) {
        newErrors.acceptedPrivacy = 'You must accept the Privacy Policy';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        // Login flow
        const response = await apiLogin(formData.email, formData.password);
        console.log('Login response:', response);

        // Check if login was successful
        const isSuccess = response?.status === 200 || (response?.access_token && response?.user);
        const hasUser = response?.user;
        const hasTokens = response?.access_token;

        if (isSuccess && hasUser) {
          // Handle web platform (cookies) vs mobile platform (tokens in body)
          if (Platform.OS === 'web') {
            // On web, tokens are in HttpOnly cookies set by backend
            // Refresh user state from cookies - force check since HttpOnly cookies aren't visible
            try {
              // Pass true to force check - cookies will be sent automatically even if not visible
              await refreshUser(true);
              // Set user state directly from response as well to ensure immediate update
              if (response.user) {
                setUser(response.user);
              }
              // Call onSuccess immediately to trigger navigation
              // The useEffect in login screen will also handle navigation based on user state
              if (onSuccess) {
                onSuccess();
              }
              Alert.alert('Success', 'Login successful!');
            } catch (error) {
              console.error('Failed to refresh user after login:', error);
              Alert.alert('Login Failed', 'Failed to retrieve user data');
              setErrors({ general: 'Failed to retrieve user data' });
            }
          } else {
            // On mobile, tokens should be in response body
            if (hasTokens) {
              // Success - tokens are already stored in AsyncStorage by apiLogin
              await contextLogin(
                response.access_token,
                response.refresh_token || '',
                response.user
              );
              
              Alert.alert('Success', 'Login successful!');
              
              if (onSuccess) {
                onSuccess();
              }
            } else {
              // Mobile login but no tokens in response
              console.warn('Mobile login: tokens not present in response payload');
              Alert.alert('Login Failed', 'Authentication tokens not received');
              setErrors({ general: 'Authentication tokens not received' });
            }
          }
        } else if (response?.error?.includes('Email not verified')) {
          Alert.alert('Email Not Verified', 'Please check your email for verification link');
          setErrors({ general: 'Check your email for verification link' });
        } else {
          const errorMsg = response?.error || response?.message || 'Login failed';
          Alert.alert('Login Failed', errorMsg);
          setErrors({ general: errorMsg });
        }
      } else {
        // Register flow
        const response = await apiService.auth.register({
          username: formData.username.toLowerCase(),
          email: formData.email,
          password: formData.password,
          accepted_terms: formData.acceptedTerms,
          accepted_privacy_policy: formData.acceptedPrivacy,
          marketing_consent: formData.marketingConsent,
          terms_accepted_at: new Date().toISOString(),
        });

        console.log('Register response:', response);

        if (response?.message || response?.email) {
          Alert.alert(
            'Account Created!',
            `Verification email sent to ${response.email || formData.email}. Please check your email.`
          );
          
          // Clear form
          setFormData({
            email: '',
            password: '',
            username: '',
            password2: '',
            acceptedTerms: false,
            acceptedPrivacy: false,
            marketingConsent: false,
          });
          
          // Switch to login mode
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      console.error('Error response:', error?.response);

      let errorMsg = 'An error occurred';
      
      if (error?.response?.data) {
        const data = error.response.data;
        
        // Handle field-specific errors
        if (data.details) {
          const backendErrors: Record<string, string> = {};
          if (data.details.email) {
            backendErrors.email = Array.isArray(data.details.email)
              ? data.details.email[0]
              : data.details.email;
          }
          if (data.details.username) {
            backendErrors.username = Array.isArray(data.details.username)
              ? data.details.username[0]
              : data.details.username;
          }
          if (data.details.password) {
            backendErrors.password = Array.isArray(data.details.password)
              ? data.details.password[0]
              : data.details.password;
          }
          setErrors(backendErrors);
          errorMsg = Object.values(backendErrors).join('\n');
        } else {
          errorMsg = data.detail || data.error || errorMsg;
          setErrors({ general: errorMsg });
        }
      }

      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      username: '',
      password2: '',
      acceptedTerms: false,
      acceptedPrivacy: false,
      marketingConsent: false,
    });
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome back!' : 'Join PropertPro'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  value={formData.username}
                  onChangeText={text => handleInputChange('username', text)}
                  placeholder="Username"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                {errors.username && (
                  <Text style={styles.errorText}>{errors.username}</Text>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={text => handleInputChange('email', text)}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                value={formData.password}
                onChangeText={text => handleInputChange('password', text)}
                placeholder="Password"
                secureTextEntry
                editable={!isLoading}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {!isLogin && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={[styles.input, errors.password2 && styles.inputError]}
                    value={formData.password2}
                    onChangeText={text => handleInputChange('password2', text)}
                    placeholder="Confirm password"
                    secureTextEntry
                    editable={!isLoading}
                  />
                  {errors.password2 && (
                    <Text style={styles.errorText}>{errors.password2}</Text>
                  )}
                </View>

                {/* Legal Documents Acceptance */}
                <View style={styles.legalSection}>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() =>
                      handleInputChange('acceptedTerms', !formData.acceptedTerms)
                    }
                    disabled={isLoading}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        formData.acceptedTerms && styles.checkboxChecked,
                        (errors.acceptedTerms || errors.acceptedPrivacy) &&
                          styles.checkboxError,
                      ]}
                    >
                      {formData.acceptedTerms && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      I accept the <Text style={styles.link}>Terms & Conditions</Text>{' '}
                      and <Text style={styles.link}>Privacy Policy</Text>{' '}
                      <Text style={styles.required}>*</Text>
                    </Text>
                  </TouchableOpacity>
                  {(errors.acceptedTerms || errors.acceptedPrivacy) && (
                    <Text style={styles.errorText}>
                      {errors.acceptedTerms || errors.acceptedPrivacy}
                    </Text>
                  )}

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() =>
                      handleInputChange(
                        'marketingConsent',
                        !formData.marketingConsent
                      )
                    }
                    disabled={isLoading}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        formData.marketingConsent && styles.checkboxChecked,
                      ]}
                    >
                      {formData.marketingConsent && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      Send me property recommendations and marketing updates{' '}
                      <Text style={styles.optional}>(optional)</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {errors.general && (
              <View
                style={[
                  styles.generalError,
                  errors.general.includes('Verification') && styles.successMessage,
                ]}
              >
                <Text
                  style={[
                    styles.generalErrorText,
                    errors.general.includes('Verification') &&
                      styles.successMessageText,
                  ]}
                >
                  {errors.general}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.submitButtonText}>
                    {isLogin ? 'Signing in...' : 'Creating...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Toggle Mode */}
          {!hideToggle && (
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={handleToggleMode} disabled={isLoading}>
                <Text style={styles.toggleLink}>
                  {isLogin ? 'Sign up' : 'Sign in'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  form: {
    gap: 12,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  legalSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxError: {
    borderColor: '#ef4444',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  link: {
    color: '#2563eb',
    fontWeight: '500',
  },
  required: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  optional: {
    color: '#6b7280',
  },
  generalError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
  },
  generalErrorText: {
    color: '#991b1b',
    fontSize: 13,
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  successMessageText: {
    color: '#15803d',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  toggleLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
});

