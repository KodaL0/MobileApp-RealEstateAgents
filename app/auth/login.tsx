import React from 'react';
import { useRouter } from 'expo-router';
import { NativeLogin } from '../_userbase/NativeLogin';
import { useUser } from '../_userbase/UserContext';
import { AuthLayout } from '../_userbase/AuthLayout';

export default function LoginScreen() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  // If already logged in, redirect to main app
  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, router]);

  const handleLoginSuccess = () => {
    // Navigate to main app after successful login
    router.replace('/(tabs)');
  };

  const handleCancel = () => {
    // Navigate back
    router.back();
  };

  return (
    <AuthLayout subtitle="Find Your Perfect Property">
      {/* Login Form */}
      <NativeLogin
        onSuccess={handleLoginSuccess}
        onCancel={handleCancel}
        initialMode="login"
      />
    </AuthLayout>
  );
}

