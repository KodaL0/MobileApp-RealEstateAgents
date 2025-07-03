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
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Message } from '../../features/chat/types';
import { useChat } from '../../features/chat/context/ChatContext';
import { useUser } from '../../_userbase/UserContext';
import { Send } from 'lucide-react-native';
import { apiClient } from '../../../config/api';

export default function ChatThreadPage() {
  // Grab the threadId from the URL
  const { threadId } = useLocalSearchParams<{ threadId: string }>();

  // Hooks from your context providers
  const { threads, messages, sendMessage, setMessages } = useChat();
  const { user } = useUser();
  const router = useRouter();

  // Local state & refs
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  // Find the thread object
  const thread = threads.find(t => t.id === threadId);
  const isPropertyThread = thread?.property !== null;
  const headerTitle = isPropertyThread 
    ? (thread?.property_title || `Property #${thread?.property}`)
    : (thread?.other_username || 'Chat');
  const propertyId = thread?.property;

  // Pull the array of messages for this thread (or empty)
  const threadMessages = messages[threadId] ?? [];

  // Auto‐scroll when the list grows
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [threadMessages.length]);

  // Fetch initial messages if not present
  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      if (!threadId) return;
      if (messages[threadId]?.length) return; // already have
      try {
        const res = await apiClient.get<{ results: Message[] }>(`chat/${threadId}/messages/?limit=30`);
        if (!isMounted) return;
        const fetched = res.data.results.reverse();
        setMessages(prev => ({ ...prev, [threadId]: fetched }));
      } catch (e) {
        console.warn('Failed to load messages', e);
      }
    };
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [threadId, messages, setMessages]);

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
    if (!user) return;
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
  const renderItem = ({ item }: ListRenderItemInfo<Message>) => {
    const isOwn = item.sender === user?.id;
    return (
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={isOwn ? styles.textOwn : styles.textOther}>{item.content}</Text>
        <Text style={styles.time}>
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
        {isPropertyThread && propertyId ? (
          <TouchableOpacity 
            onPress={() => router.push(`/property/${propertyId}`)}
            style={styles.headerTitleContainer}
          >
            <Text style={[styles.headerTitle, styles.clickableTitle]} numberOfLines={1}>
              {headerTitle}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        )}
        <View style={{ width: 32 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <FlatList<Message>
          ref={flatListRef}
          data={threadMessages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={renderItem}
        />

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
              { 
                opacity: (!input.trim() || isSending) ? 0.5 : 1,
                backgroundColor: isSending ? '#ccc' : 'transparent'
              }
            ]}
            disabled={!input.trim() || isSending}
          >
            <Send size={20} color={(!input.trim() || isSending) ? '#999' : '#000'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
    minHeight: 48,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backText: {
    fontSize: 28,
    color: '#0F3460',
    fontWeight: 'bold',
    marginTop: -2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#0F3460',
    textAlign: 'center',
  },
  bubble: { marginBottom: 12, padding: 10, borderRadius: 20, maxWidth: '80%' },
  bubbleOwn: {
    backgroundColor: '#0F3460',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4
  },
  bubbleOther: {
    backgroundColor: '#F5F7FA',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4
  },
  textOwn: { color: '#fff' },
  textOther: { color: '#0F3460' },
  time: { marginTop: 4, fontSize: 10, color: '#666' },
  inputBar: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100
  },
  sendButton: { padding: 8 },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickableTitle: {
    color: '#007bff',
    textDecorationLine: 'underline',
  },
});
