import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useChat } from '@/app/features/chat/context/ChatContext';
import { useUser } from '@/app/_userbase/UserContext';
import { api } from '@/config/api';

interface ChatButtonProps {
  sellerId: number;
  propertyId: number;
  title: string;
}

export default function ChatButton({
  sellerId,
  propertyId,
  title,
}: ChatButtonProps) {
  const router = useRouter();
  const { getOrCreateThread } = useChat();
  const { isAuthenticated } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Required',
        'Please log in to send a message.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      // Track chat initiation
      try {
        await api.analytics.trackConversion(propertyId, 'chat');
      } catch (e) {
        console.error('Failed to track chat click:', e);
      }

      const threadId = await getOrCreateThread(sellerId, propertyId, title);
      
      router.push({
        pathname: '/chat/[threadId]',
        params: { threadId: String(threadId) },
      });
    } catch (error) {
      console.error('Error initiating chat:', error);
      Alert.alert(
        'Error',
        'Failed to start conversation. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <MessageSquare size={18} color="#fff" />
          <Text style={styles.buttonText}>Message</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F3460',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#fff',
  },
});

