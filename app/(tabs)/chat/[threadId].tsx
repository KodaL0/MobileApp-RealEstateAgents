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
      console.warn('No user found for recipient ID calculation');
      return 0;
    }
    
    // If we have a thread, get the other user from the thread
    if (thread) {
      const otherUserId = thread.user1 === user.id ? thread.user2 : thread.user1;
      console.log('Recipient ID from thread:', otherUserId);
      return otherUserId;
    }
    
    // Fallback to message history
    if (!threadMessages.length) {
      console.warn('No messages in thread to determine recipient');
      return 0;
    }
    
    const last = threadMessages[threadMessages.length - 1];
    const recipientId = last.sender === user.id ? last.recipient : last.sender;
    console.log('Recipient ID from messages:', recipientId);
    return recipientId;
  };

  // Send handler
  const onSend = async () => {
    console.log('=== Send button pressed ===');
    const text = input.trim();
    
    if (!text) {
      console.warn('Empty message, not sending');
      return;
    }
    
    if (!threadId) {
      console.error('No threadId available');
      return;
    }
    
    if (!user) {
      console.error('No user logged in');
      return;
    }
    
    const recipientId = getRecipientId();
    if (!recipientId) {
      console.error('Could not determine recipient ID');
      return;
    }
    
    console.log('Sending message:', {
      threadId,
      recipientId,
      content: text,
      propertyId,
      user: user.id
    });
    
    try {
      // Clear input immediately for better UX
      setInput('');
      
      // Send the message with proper parameter order
      sendMessage(threadId, recipientId, text, propertyId || undefined);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore input if sending failed
      setInput(text);
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
      {/* Debug Info - Remove in production */}
      <View style={{ padding: 10, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderColor: '#ddd' }}>
        <Text style={{ fontSize: 12, color: '#666' }}>
          Debug: ThreadID={threadId}, User={user?.id}, Thread={thread ? 'found' : 'not found'}
        </Text>
        {thread && (
          <Text style={{ fontSize: 12, color: '#666' }}>
            Thread Users: {thread.user1} & {thread.user2}, Property: {thread.property || 'DM'}
          </Text>
        )}
        <Text style={{ fontSize: 12, color: '#666' }}>
          Messages: {threadMessages.length}, RecipientID: {getRecipientId()}
        </Text>
      </View>
      
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
          <TouchableOpacity onPress={onSend} style={styles.sendButton}>
            <Send size={20} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              console.log('Test button pressed');
              setInput('Test message from debug button');
            }} 
            style={[styles.sendButton, { backgroundColor: '#e0e0e0' }]}
          >
            <Text style={{ fontSize: 12 }}>Test</Text>
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
