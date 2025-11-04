import React from 'react';
import { useRouter } from 'expo-router';
import { NativeLogin } from '../_userbase/NativeLogin';
import { useUser } from '../_userbase/UserContext';
import { AuthLayout } from '../_userbase/AuthLayout';

export default function RegisterScreen() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  // If already logged in, redirect to main app
  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, router]);

  const handleRegisterSuccess = () => {
    // After registration, user will need to verify email
    // Stay on this screen to show the success message
    // The component itself handles the success message
  };

  const handleCancel = () => {
    // Navigate back
    router.back();
  };

  return (
    <AuthLayout subtitle="Join Our Community">
      {/* Registration Form */}
      <NativeLogin
        onSuccess={handleRegisterSuccess}
        onCancel={handleCancel}
        initialMode="register"
      />
    </AuthLayout>
  );
}

