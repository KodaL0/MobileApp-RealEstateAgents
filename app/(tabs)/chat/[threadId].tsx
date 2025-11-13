// File: app/(tabs)/Chat/[threadId].tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ListRenderItemInfo,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, usePathname, useFocusEffect } from 'expo-router';
import type { Message } from '../../features/types';
import { useChat } from '../../features/chat/context/ChatContext';
import { useUser } from '../../_userbase/UserContext';
import { useRequireAuth } from '../../_userbase/hooks/useRequireAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, ArrowLeft, Home, User } from 'lucide-react-native';
import { apiClient } from '../../../config/api';
import { setLastChatRoute } from '../../features/chat/navigationState';

const formatDayLabel = (isoString: string) => {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) {
    return 'Today';
  }
  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export default function ChatThreadPage() {
  // Grab the threadId from the URL
  const { threadId } = useLocalSearchParams<{ threadId: string }>();

  // Hooks from your context providers
  const { threads, messages, sendMessage, setMessages } = useChat();
  const { user } = useUser();
  const { isLoading: authLoading } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Local state & refs
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const hasFetchedRef = useRef<string | null>(null);

  // Find the thread object
  const thread = threads.find(t => t.id === threadId);
  const isPropertyThread = thread?.property !== null;
  const headerTitle = isPropertyThread 
    ? (thread?.property_title || `Property #${thread?.property}`)
    : (thread?.other_username || 'Chat');
  const propertyId = thread?.property;

  // Pull the array of messages for this thread (or empty)
  const threadMessages = messages[threadId] ?? [];

  useFocusEffect(
    React.useCallback(() => {
      if (pathname) {
        setLastChatRoute(pathname);
      }
    }, [pathname])
  );

  // Auto‐scroll when the list grows
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [threadMessages.length]);

  // Fetch initial messages if not present
  useEffect(() => {
    if (!threadId) return;
    
    // Skip if already fetched for this threadId or if messages exist
    if (hasFetchedRef.current === threadId || messages[threadId]?.length) {
      return;
    }
    
    let isMounted = true;
    hasFetchedRef.current = threadId;
    
    const loadInitial = async () => {
      setIsFetching(true);
      try {
        const res = await apiClient.get<{ results: Message[] }>(`chat/${threadId}/messages/?limit=30`);
        if (!isMounted) return;
        const fetched = res.data.results.reverse();
        setMessages(prev => ({ ...prev, [threadId]: fetched }));
      } catch (e) {
        console.warn('Failed to load messages', e);
        // Reset flag on error so we can retry
        if (isMounted) {
          hasFetchedRef.current = null;
        }
      }
      if (isMounted) {
        setIsFetching(false);
      }
    };
    
    loadInitial();
    
    return () => {
      isMounted = false;
      // Reset fetch flag when threadId changes (cleanup)
      if (hasFetchedRef.current === threadId) {
        hasFetchedRef.current = null;
      }
    };
    // Only depend on threadId - messages check is inside the effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Figure out who we're sending *to* -- if last message was from me, flip
  const getRecipientId = (): number => {
    if (!user) {
      return 0;
    }
    
    // If we have a thread, get the other user from the thread
    if (thread) {
      const otherUserId = thread.user1 === user.id ? thread.user2 : thread.user1;
      return otherUserId;
    }
    
    // Fallback to message history
    if (!threadMessages.length) {
      return 0;
    }
    
    const last = threadMessages[threadMessages.length - 1];
    const recipientId = last.sender === user.id ? last.recipient : last.sender;
    return recipientId;
  };

  // Send handler
  const onSend = async () => {
    const text = input.trim();
    
    if (!text) return;
    if (!threadId) return;
    if (!user || authLoading) return;
    if (isSending) return; // Prevent double sends
    
    const recipientId = getRecipientId();
    if (!recipientId) return;
    
    setIsSending(true);
    
    try {
      // Send the message first, THEN clear input on success
      await sendMessage(threadId, recipientId, text, propertyId || undefined);
      
      // Only clear input if message was sent successfully
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Don't clear input if sending failed - keep the message for user to retry
    } finally {
      setIsSending(false);
    }
  };

  // Render each bubble
  const renderItem = ({ item, index }: ListRenderItemInfo<Message>) => {
    const isOwn = item.sender === user?.id;
    const previous = threadMessages[index - 1];
    const isFirstOfDay =
      !previous ||
      new Date(previous.created_at).toDateString() !== new Date(item.created_at).toDateString();

    return (
      <View>
        {isFirstOfDay && (
          <View style={styles.dayDivider}>
            <Text style={styles.dayDividerText}>{formatDayLabel(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
          {!isOwn && (
            <View style={styles.bubbleAvatar}>
              {isPropertyThread ? (
                <Home size={16} color="#0F3460" />
              ) : (
                <User size={16} color="#0F3460" />
              )}
            </View>
          )}
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            <Text style={isOwn ? styles.textOwn : styles.textOther}>{item.content}</Text>
            <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#EEF2FF', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
            <ArrowLeft size={20} color="#0F3460" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerAvatarWrapper}>
              {isPropertyThread && thread?.property_image ? (
                <Image source={{ uri: thread.property_image }} style={styles.headerImage} />
              ) : (
                <View style={styles.headerIcon}>
                  {isPropertyThread ? (
                    <Home size={18} color="#FFFFFF" />
                  ) : (
                    <User size={18} color="#FFFFFF" />
                  )}
                </View>
              )}
            </View>
            <View style={styles.headerTextGroup}>
              {isPropertyThread && propertyId ? (
                <TouchableOpacity onPress={() => router.push(`/property/${propertyId}`)}>
                  <Text style={[styles.headerTitle, styles.clickableTitle]} numberOfLines={1}>
                    {headerTitle}
                  </Text>
                </TouchableOpacity>
              ) : thread?.other_username ? (
                <TouchableOpacity onPress={() => router.push(`/agent/${thread.other_username}`)}>
                  <Text style={[styles.headerTitle, styles.clickableTitle]} numberOfLines={1}>
                    {headerTitle}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
              )}
              <Text style={styles.headerSubtitle}>
                {isPropertyThread ? 'Property conversation' : 'Direct message'}
              </Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={80}
        >
          <FlatList<Message>
            ref={flatListRef}
            data={threadMessages}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            ListEmptyComponent={
              isFetching ? (
                <View style={styles.emptyLoading}>
                  <ActivityIndicator size="small" color="#0F3460" />
                  <Text style={styles.emptyLoadingText}>Loading messages…</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Start the conversation</Text>
                  <Text style={styles.emptySubtitle}>
                    Share property preferences, schedule a tour, or ask a quick question to get things moving.
                  </Text>
                </View>
              )
            }
            ListFooterComponent={
              isFetching ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color="#0F3460" />
                </View>
              ) : null
            }
          />

          <View style={styles.quickReplies}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplyRow}>
              {['Thanks for the update!', 'Can we schedule a viewing?', 'What\'s the neighborhood like?'].map(reply => (
                <TouchableOpacity
                  key={reply}
                  style={styles.quickReplyChip}
                  onPress={() =>
                    setInput(prev => (prev ? `${prev.trimEnd()} ${reply}` : reply))
                  }
                >
                  <Text style={styles.quickReplyText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Type a message…"
              value={input}
              onChangeText={setInput}
              multiline
            />
            <TouchableOpacity 
              onPress={onSend} 
              style={[
                styles.sendButton, 
                { opacity: (!input.trim() || isSending) ? 0.5 : 1 }
              ]}
              disabled={!input.trim() || isSending}
            >
              <LinearGradient
                colors={['#4C6EF5', '#5B8DEF']}
                style={styles.sendGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EEF2FF' },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E0FF',
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(15, 52, 96, 0.08)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerAvatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0F3460',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F3460',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#5B6C8F',
  },
  headerSpacer: { width: 36 },
  clickableTitle: {
    color: '#1D4ED8',
  },
  keyboardAvoider: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15,52,96,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '80%',
    shadowColor: '#0F3460',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  bubbleOwn: {
    backgroundColor: '#0F3460',
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
  },
  textOwn: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
  textOther: { color: '#0F3460', fontSize: 15, lineHeight: 20 },
  time: { marginTop: 6, fontSize: 11 },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  timeOther: { color: '#6B7AA8' },
  dayDivider: {
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 52, 96, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  dayDividerText: {
    fontSize: 12,
    color: '#0F3460',
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E0FF',
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    maxHeight: 110,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeaderSpacer: { height: 16 },
  emptyState: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  emptyLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyLoadingText: {
    fontSize: 13,
    color: '#5B6C8F',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F3460',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#5B6C8F',
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: 16,
  },
  quickReplies: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E0FF',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  quickReplyRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  quickReplyChip: {
    backgroundColor: 'rgba(76, 110, 245, 0.12)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickReplyText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '500',
  },
});
