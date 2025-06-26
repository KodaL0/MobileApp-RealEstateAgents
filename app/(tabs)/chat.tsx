// File: app/(tabs)/chat.tsx
import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useChat } from '../features/chat/context/ChatContext';
import { useUser } from '../features/chat/context/UserContext';
import { Home, Clock } from 'lucide-react-native';
import type { Thread } from '../features/chat/types';

export default function ThreadList() {
  const router = useRouter();
  const { threads, messages } = useChat();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtered, setFiltered] = useState<Thread[]>(threads);

  useEffect(() => {
    const list = threads.filter(thread => {
      const title = thread.property_title || thread.other_username || '';
      return title.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setFiltered(list);
  }, [threads, searchTerm]);

  const getLastMessage = (threadId: string) => {
    const msgs = messages[threadId] || [];
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / 36e5;
    if (diffHours < 1) return `${Math.floor(diffHours * 60)}m`;
    if (diffHours < 24) return `${Math.floor(diffHours)}h`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TextInput
          style={styles.search}
          placeholder="Search conversations..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item: thread }) => {
          const last = getLastMessage(thread.id);
          const unread = (messages[thread.id] || []).filter(
            m => !m.read_at && m.sender !== user?.id
          ).length;

          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() => router.push(`/chat/${thread.id}`)}
            >
              <View style={styles.avatar}>
                {thread.property_image ? (
                  <Image
                    source={{ uri: thread.property_image }}
                    style={styles.image}
                  />
                ) : (
                  <View style={styles.iconBg}>
                    <Home size={20} color="#FFF" />
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
                  {last?.content || 'Start the conversation'}
                </Text>
              </View>

              <View style={styles.meta}>
                {last && <Text style={styles.time}>{formatTime(last.created_at)}</Text>}
                {last?.sender === user?.id && <Clock size={12} color="#666" />}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F3460' },
  search: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
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
});
