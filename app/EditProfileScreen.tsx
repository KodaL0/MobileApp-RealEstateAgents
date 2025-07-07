import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Save, Loader2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/app/_userbase/UserContext';
import { api } from '@/config/api';

export default function EditProfileScreen() {
  const { user, setUser } = useUser();
  const router = useRouter();

  const [profileData, setProfileData] = useState({
    username: '',
    name: '',
    bio: '',
    location: '',
    phone: '',
    office: '',
  });

  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const response = await api.auth.getUser();
      if (response.status === 200) {
        const u = response.user;
        setProfileData({
          username: u.username || '',
          name: u.name || '',
          bio: u.bio || '',
          location: u.location || '',
          phone: u.phone || '',
          office: u.office || '',
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setProfileError('Failed to load profile data.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const validatePhone = (phone: string): string | null => {
    if (!phone) return null;
    const phoneRegex = /^\+?1?\d{9,15}$/;
    const cleanedPhone = phone.replace(/\s+/g, '');
    if (!phoneRegex.test(cleanedPhone)) return 'Please enter a valid phone number (9-15 digits)';
    return null;
  };

  const validateWebsite = (website: string): string | null => {
    if (!website) return null;
    try {
      new URL(website);
      return null;
    } catch {
      return 'Please enter a valid website URL (e.g., https://example.com)';
    }
  };

  const handleProfileChange = (field: keyof typeof profileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setProfileMessage('');
    setProfileError('');
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage('');
    setProfileError('');

    const phoneError = validatePhone(profileData.phone);

    if (phoneError) {
      setProfileError(phoneError);
      setIsSavingProfile(false);
      return;
    }

    try {
      const res = await api.auth.updateProfile(profileData);
      if (res.status === 200) {
        setProfileMessage('Profile updated successfully!');
        // ✅ Key fix: merge updated fields with required user fields
        setUser({
          ...user!,
          ...profileData,
        });
      }
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setProfileError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F3460" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Edit Profile</Text>

      {profileMessage ? <Text style={styles.success}>{profileMessage}</Text> : null}
      {profileError ? <Text style={styles.error}>{profileError}</Text> : null}

      {['username', 'name', 'bio', 'location', 'phone', 'office'].map((field) => (
        <View key={field} style={styles.inputGroup}>
          <Text style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
          <TextInput
            style={[styles.input, field === 'bio' && styles.textarea]}
            value={profileData[field as keyof typeof profileData]}
            onChangeText={(text) => handleProfileChange(field as keyof typeof profileData, text)}
            placeholder={`Enter ${field}`}
            multiline={field === 'bio'}
          />
          {field === 'bio' && (
            <Text style={styles.counter}>{profileData.bio.length}/500 characters</Text>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveButton, isSavingProfile && styles.disabledButton]}
        disabled={isSavingProfile}
        onPress={handleSaveProfile}
      >
        {isSavingProfile ? (
          <>
            <Loader2 color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.saveButtonText}>Saving...</Text>
          </>
        ) : (
          <>
            <Save color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#0F3460' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  textarea: { height: 100, textAlignVertical: 'top' },
  counter: { fontSize: 12, color: '#666', marginTop: 4 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F3460', paddingVertical: 14, borderRadius: 8 },
  disabledButton: { backgroundColor: '#888' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  success: { color: 'green', marginBottom: 16 },
  error: { color: 'red', marginBottom: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 16, color: '#666' },
});
