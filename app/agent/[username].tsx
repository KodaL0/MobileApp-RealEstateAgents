import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Mail,
  Home,
  Users,
  Share2,
  MessageCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { api } from '@/config/api';
import { useChat } from '@/app/features/chat/context/ChatContext';
import { useUser } from '@/app/_userbase/UserContext';
import { useSmartBack } from '@/hooks/useSmartBack';
import type { PublicProfileData } from '@/app/features/types';

export default function AgentProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ username?: string | string[] }>();
  const username = useMemo(() => {
    const param = params.username;
    if (!param) return '';
    return Array.isArray(param) ? param[0] : param;
  }, [params.username]);

  const { getOrCreateDmThread } = useChat();
  const { isAuthenticated } = useUser();
  const handleBack = useSmartBack();

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!username) {
      setError('Agent username missing.');
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.getPublicProfile(username);
      setProfile(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load agent profile:', err);
      setError('Unable to load agent profile at this time.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const handleOpenLink = (url?: string | null) => {
    if (!url) return;
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(normalized).catch(err => console.warn('Failed to open url', err));
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(err => console.warn('Failed to start call', err));
  };

  const handleEmail = (email?: string | null) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(err => console.warn('Failed to open mail client', err));
  };

  const handleMessageAgent = async () => {
    if (!profile) return;

    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to message this agent.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(tabs)/profile') },
      ]);
      return;
    }

    try {
      const threadId = await getOrCreateDmThread(profile.id);
      router.push(`/chat/${threadId}`);
    } catch (err) {
      console.error('Failed to open chat thread:', err);
      Alert.alert('Error', 'Could not open chat. Please try again later.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F3460" />
          <Text style={styles.loadingText}>Loading agent...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error || 'Agent not found.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = (profile.name && profile.name.trim()) || profile.username || 'Agent';
  const initial = displayName.charAt(0).toUpperCase();
  const addressLine = profile.office?.trim() || null;
  const city = profile.location?.split(',')[0]?.trim() || null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <LinearGradient
          colors={['#10172b', '#16204a', '#1d2f70']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBackground}
        />
        <View style={styles.heroHeaderRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={18} color="#E2E8F0" />
          </TouchableOpacity>
          <Text style={styles.heroHeaderTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.heroHeaderSpacer} />
        </View>
        <View style={styles.heroBody}>
          <View style={styles.heroAvatarColumn}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.heroAvatar} />
            ) : (
              <View style={styles.heroFallbackAvatar}>
                <Text style={styles.heroFallbackInitial}>{initial}</Text>
              </View>
            )}
            {addressLine ? (
              <Text style={styles.heroAddress} numberOfLines={2}>
                {addressLine}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F3460" />
        }
      >
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.ctaMessageButton}
            onPress={handleMessageAgent}
            accessibilityRole="button"
            accessibilityLabel="Message agent"
          >
            <LinearGradient
              colors={['#34D399', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaMessageGradient}
            >
              <MessageCircle size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaShareButton}
            onPress={() => Alert.alert('Share', 'Sharing coming soon!')}
            accessibilityRole="button"
            accessibilityLabel="Share agent profile"
          >
            <Share2 size={18} color="#0F3460" />
          </TouchableOpacity>
        </View>

        {city ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>City</Text>
            <View style={styles.infoCardValueRow}>
              <MapPin size={14} color="#0F3460" />
              <Text style={styles.infoCardValue}>{city}</Text>
            </View>
          </View>
        ) : null}

        {/* Compact Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push({
              pathname: '/listings/[agentId]',
              params: { agentId: profile.username },
            } as never)}
          >
            <Home size={20} color="#0F3460" />
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonValue}>
                {profile.properties_count ?? 0}
              </Text>
              <Text style={styles.actionButtonLabel}>Listings</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push({
              pathname: '/connections/[agentId]',
              params: { agentId: profile.username },
            } as never)}
          >
            <Users size={20} color="#0F3460" />
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionButtonValue}>{profile.connections_count ?? 0}</Text>
              <Text style={styles.actionButtonLabel}>Connections</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionBody}>
            {profile.bio?.trim() ||
              'This agent has not added a bio yet. Explore their listings or contact them directly for more information.'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactGrid}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleCall(profile.phone)}
              disabled={!profile.phone}
            >
              <Phone size={18} color="#0F3460" />
              <Text style={styles.contactButtonLabel}>
                {profile.phone || 'Phone unavailable'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={() => handleEmail(profile.email)}>
              <Mail size={18} color="#0F3460" />
              <Text style={styles.contactButtonLabel}>{profile.email}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleOpenLink(profile.website)}
              disabled={!profile.website}
            >
              <Globe size={18} color="#0F3460" />
              <Text style={styles.contactButtonLabel}>
                {profile.website || 'Website unavailable'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.92,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,28,48,0.45)',
  },
  heroHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    paddingHorizontal: 12,
  },
  heroHeaderSpacer: {
    width: 32,
    height: 32,
  },
  heroBody: {
    alignItems: 'center',
  },
  heroAvatarColumn: {
    alignItems: 'center',
    gap: 8,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  heroFallbackAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackInitial: {
    fontSize: 26,
    fontWeight: '700',
    color: '#EFF6FF',
  },
  heroAddress: {
    color: '#E5EDFF',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 160,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  ctaSection: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  ctaMessageButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaMessageGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaShareButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  infoCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonContent: {
    flex: 1,
    gap: 2,
  },
  actionButtonValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionButtonLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4B5563',
  },
  contactGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  contactButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
  },
  contactButtonLabel: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0F3460',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

