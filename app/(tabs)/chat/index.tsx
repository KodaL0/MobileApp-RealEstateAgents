// File: app/(tabs)/chat.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams, usePathname, useFocusEffect } from 'expo-router';
import { useChat } from '../../features/chat/context/ChatContext';
import { useUser } from '../../_userbase/UserContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Clock, User, Search, MessageSquare, Plus } from 'lucide-react-native';
import type { Thread } from '../../features/types';
import { setLastChatRoute } from '../../features/chat/navigationState';

export default function ThreadList() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ownerId?: string; propertyId?: string; title?: string }>();
  const { threads, messages, getOrCreateThread, refreshThreads } = useChat();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'property' | 'dm'>('dm');
  const [filtered, setFiltered] = useState<Thread[]>(threads);
  const pathname = usePathname();

  // Handle URL parameters for creating new threads (from property details)
  useEffect(() => {
    const handleMessageOwner = async () => {
      if (params.ownerId && params.propertyId) {
        if (!user) {
          // User not authenticated, redirect to login
          console.log('User not authenticated, cannot create thread');
          return;
        }

        try {
          const ownerId = parseInt(params.ownerId);
          const propertyId = parseInt(params.propertyId);
          
          if (!isNaN(ownerId) && !isNaN(propertyId)) {
            console.log('Creating/finding thread for owner:', ownerId, 'property:', propertyId);
            
            // Create or find existing thread
            const threadId = await getOrCreateThread(ownerId, propertyId, params.title);
            
            // Navigate to the specific thread
            router.replace(`/chat/${threadId}`);
          }
        } catch (error) {
          console.error('Failed to create thread:', error);
        }
      }
    };

    handleMessageOwner();
  }, [params.ownerId, params.propertyId, params.title, user, getOrCreateThread, router]);

  const getLastMessage = useCallback((threadId: string) => {
    const msgs = messages[threadId] || [];
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  }, [messages]);

  useEffect(() => {
    // 1. Filter by tab (DM or property) **first** to avoid extra work
    const base = threads.filter(t => (activeTab === 'property' ? t.property !== null : t.property === null));

    // 2. Apply search within that subset
    const list = base
      .filter(t => {
        const title = t.property_title || t.other_username || '';
        return title.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        // Sort by most recent message timestamp for better relevance
        const aLastMessage = getLastMessage(a.id);
        const bLastMessage = getLastMessage(b.id);
        
        // Use the most recent timestamp available
        const aTimestamp = aLastMessage?.created_at || a.updated_at || new Date(0).toISOString();
        const bTimestamp = bLastMessage?.created_at || b.updated_at || new Date(0).toISOString();
        
        return new Date(bTimestamp).getTime() - new Date(aTimestamp).getTime();
      });

    setFiltered(list);
  }, [threads, searchTerm, activeTab, getLastMessage]);

  useFocusEffect(
    React.useCallback(() => {
      refreshThreads().catch(err => console.warn('Failed to refresh threads', err));
      if (pathname) {
        setLastChatRoute(pathname);
      }
    }, [pathname, refreshThreads])
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / 36e5;
    if (diffHours < 1) return `${Math.floor(diffHours * 60)}m`;
    if (diffHours < 24) return `${Math.floor(diffHours)}h`;
    return date.toLocaleDateString();
  };

  return (
    <LinearGradient
      colors={['#EEF2FF', '#FFFFFF']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Messages</Text>
          </View>
          <View style={styles.avatarShell}>
            <MessageSquare size={18} color="#FFFFFF" />
            <View style={styles.plusIcon}>
              <Plus size={10} color="#0F3460" strokeWidth={3} />
            </View>
          </View>
        </View>

        <View style={styles.searchWrapper}>
          <View style={styles.search}>
            <Search size={18} color="#5B6C8F" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor="#8C9AC2"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'dm' && styles.tabActive]}
            onPress={() => setActiveTab('dm')}
          >
            <View style={[styles.tabIcon, activeTab === 'dm' && styles.tabIconActive]}>
              <User size={18} color={activeTab === 'dm' ? '#0F3460' : '#5B6C8F'} />
            </View>
            <Text style={[styles.tabLabel, activeTab === 'dm' && styles.tabLabelActive]}>Direct</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'property' && styles.tabActive]}
            onPress={() => setActiveTab('property')}
          >
            <View style={[styles.tabIcon, activeTab === 'property' && styles.tabIconActive]}>
              <Home size={18} color={activeTab === 'property' ? '#0F3460' : '#5B6C8F'} />
            </View>
            <Text style={[styles.tabLabel, activeTab === 'property' && styles.tabLabelActive]}>Property</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={filtered.length === 0 ? styles.emptyListContent : styles.listContent}
          renderItem={({ item: thread }) => {
          const last = getLastMessage(thread.id);
          const unread = (messages[thread.id] || []).filter(
            m => !m.read_at && m.sender !== user?.id
          ).length;
          const previewPrefix = last
            ? last.sender === user?.id
              ? 'You: '
              : `${thread.other_username || 'Agent'}: `
            : '';

          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/chat/${thread.id}`)}
            >
              <View style={styles.avatar}>
                {thread.property ? (
                  thread.property_image ? (
                    <Image
                      source={{ uri: thread.property_image }}
                      style={styles.image}
                    />
                  ) : (
                    <View style={styles.iconBg}>
                      <Home size={20} color="#FFF" />
                    </View>
                  )
                ) : (
                  <View style={styles.iconBg}>
                    <User size={20} color="#FFF" />
                  </View>
                )}
                {unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {unread > 99 ? '99+' : unread}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.content}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {thread.property_title || thread.other_username}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {last ? `${previewPrefix}${last.content}` : 'No messages yet'}
                </Text>
              </View>

              <View style={styles.meta}>
                {last && <Text style={styles.time}>{formatTime(last.created_at)}</Text>}
                {last?.sender === user?.id && <Clock size={12} color="#666" />}
              </View>
            </TouchableOpacity>
          );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Start a conversation with an agent or property owner directly from a listing.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#0F3460' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#5B6C8F', maxWidth: 240 },
  avatarShell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F3460',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F3460',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    position: 'relative',
  },
  plusIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5F5',
    shadowColor: '#0F3460',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F3460' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E3E8FF',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  avatar: { marginRight: 12, position: 'relative' },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0F3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: 44, height: 44, borderRadius: 12 },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  content: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#0F3460' },
  itemSubtitle: { marginTop: 4, fontSize: 14, color: '#666' },
  meta: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#666' },
  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5F5',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0F3460',
    shadowColor: '#0F3460',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tabIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 52, 96, 0.12)',
  },
  tabIconActive: {
    backgroundColor: 'rgba(15, 52, 96, 0.18)',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B6C8F',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    marginTop: 60,
    marginHorizontal: 32,
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F3460',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0F3460' },
  emptySubtitle: { fontSize: 14, color: '#5B6C8F', textAlign: 'center' },
  listContent: { paddingBottom: 24 },
  emptyListContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 48 },
});
