import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { ArrowLeft, Users, UserCircle } from 'lucide-react-native';

import { api } from '@/config/api';
import type { PublicProfileData } from '@/app/features/types';

type ConnectionUser = {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
  location?: string;
  date_joined: string;
};

export default function AgentConnectionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ agentId?: string }>();
  const username = useMemo(() => params.agentId?.toString() ?? '', [params.agentId]);

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [mutualConnections, setMutualConnections] = useState<ConnectionUser[]>([]);
  const [activeTab, setActiveTab] = useState<'connections' | 'mutual'>('connections');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!username) {
      setError('Agent username missing.');
      setLoading(false);
      return;
    }

    try {
      const [profileData, connectionsData, mutualData] = await Promise.all([
        api.auth.getPublicProfile(username),
        api.connections.getAgentConnections(username),
        api.connections.getAgentConnections(username, 'mutual'),
      ]);
      setProfile(profileData);
      setConnections(connectionsData.connections || []);
      setMutualConnections(mutualData.connections || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load connections:', err);
      setError('Unable to load connections at this time.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleUserPress = (userId: number, userUsername: string) => {
    router.push({
      pathname: '/agent/[username]',
      params: { username: userUsername },
    } as never);
  };

  const displayName = (user: ConnectionUser) => {
    return (user.name && user.name.trim()) || user.username || 'User';
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F3460" />
          <Text style={styles.loadingText}>Loading connections...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentList = activeTab === 'connections' ? connections : mutualConnections;
  const currentCount =
    activeTab === 'connections' ? profile.connections_count : profile.mutual_connections_count;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{profile.name || profile.username}</Text>
          <Text style={styles.headerSubtitle}>Connections</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'connections' && styles.tabActive]}
          onPress={() => setActiveTab('connections')}
        >
          <Users size={18} color={activeTab === 'connections' ? '#0F3460' : '#6B7280'} />
          <Text
            style={[
              styles.tabText,
              activeTab === 'connections' && styles.tabTextActive,
            ]}
          >
            Connections ({profile.connections_count ?? 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mutual' && styles.tabActive]}
          onPress={() => setActiveTab('mutual')}
        >
          <UserCircle size={18} color={activeTab === 'mutual' ? '#0F3460' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'mutual' && styles.tabTextActive]}>
            Mutual ({profile.mutual_connections_count ?? 0})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F3460" />
        }
      >
        {currentList.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'connections'
                ? 'No connections yet'
                : 'No mutual connections'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'connections'
                ? 'This agent has not connected with anyone yet.'
                : 'You and this agent don\'t have any mutual connections yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.connectionsList}>
            {currentList.map(user => {
              const name = displayName(user);
              const initial = getInitial(name);

              return (
                <TouchableOpacity
                  key={user.id}
                  style={styles.connectionCard}
                  onPress={() => handleUserPress(user.id, user.username)}
                >
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>
                  )}
                  <View style={styles.connectionInfo}>
                    <Text style={styles.connectionName}>{name}</Text>
                    {user.location && (
                      <Text style={styles.connectionLocation}>{user.location}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#0F172A',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0F3460',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#0F3460',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  connectionsList: {
    gap: 12,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EFF6FF',
  },
  connectionInfo: {
    flex: 1,
    gap: 4,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  connectionLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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

