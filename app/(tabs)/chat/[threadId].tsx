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
import { useLocalSearchParams } from 'expo-router';
import type { Message } from '../../features/chat/types';
import { useChat } from '../../features/chat/context/ChatContext';
import { useUser } from '../../features/chat/context/UserContext';
import { Send } from 'lucide-react-native';

export default function ChatThreadPage() {
  // Grab the threadId from the URL
  const { threadId } = useLocalSearchParams<{ threadId: string }>();

  // Hooks from your context providers
  const { messages, sendMessage } = useChat();
  const { user } = useUser();

  // Local state & refs
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  // Pull the array of messages for this thread (or empty)
  const threadMessages = messages[threadId] ?? [];

  // Auto‐scroll when the list grows
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [threadMessages.length]);

  // Figure out who we're sending *to* -- if last message was from me, flip
  const getRecipientId = (): number => {
    if (!threadMessages.length || !user) return 0;
    const last = threadMessages[threadMessages.length - 1];
    return last.sender === user.id ? last.recipient : last.sender;
  };

  // Send handler
  const onSend = () => {
    const text = input.trim();
    if (!text) return;
    const recipientId = getRecipientId();
    sendMessage(threadId, recipientId, text);
    setInput('');
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  sendButton: { padding: 8 }
});
