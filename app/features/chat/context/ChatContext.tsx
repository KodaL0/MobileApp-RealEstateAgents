// File: app/features/chat/context/ChatContext.tsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, WS_BASE_URL } from '@/config/api';
import { useUser } from '../../../_userbase/UserContext';
import { Thread, Message } from '../types';

interface ChatContextValue {
  threads: Thread[];
  messages: Record<string, Message[]>;
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  getOrCreateThread: (
    sellerId: number,
    propertyId: number | null,
    title?: string
  ) => Promise<string>;
  getOrCreateDmThread: (userId: number) => Promise<string>;
  sendMessage: (
    threadId: string,
    recipientId: number,
    content: string,
    propertyId?: number
  ) => Promise<void>;
  markThreadRead: (threadId: string) => void;
  sendTypingStart: (threadId: string, recipientId: number) => void;
  sendTypingStop: (threadId: string, recipientId: number) => void;
  unsendMessage: (messageId: string) => Promise<void>;
  typingUsers: Record<string, boolean>;
  userStatuses: Record<number, 'online' | 'offline'>;
  recalculateUnreadCounts: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/** Read token from AsyncStorage (cross‐platform) */
const getToken = async (): Promise<string | null> =>
  (await AsyncStorage.getItem('access_token')) ??
  (await AsyncStorage.getItem('mobile_access_token')) ??
  null;

/** Get the WebSocket base URL */
function makeWsUrl(): string {
  return WS_BASE_URL;
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useUser();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [userStatuses, setUserStatuses] = useState<
    Record<number, 'online' | 'offline'>
  >({});

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const pingRef = useRef<number | null>(null);

  const openSocket = useCallback(async () => {
    // if already open or connecting, skip
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = await getToken();
    const url = token
      ? `${makeWsUrl()}/ws/chat/?token=${encodeURIComponent(token)}`
      : `${makeWsUrl()}/ws/chat/`;

    ws.current = new WebSocket(url);

    // ping every 30s
    pingRef.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);

    ws.current.onopen = () => console.log('Chat WS connected');
    ws.current.onerror = (e) => console.warn('Chat WS error', e);
    ws.current.onclose = async (event) => {
      // cleanup ping
      if (pingRef.current) clearInterval(pingRef.current);
      ws.current = null;
      
      // Check if this might be a token expiration issue
      if (event.code === 4001 || event.code === 1008) {
        console.log('WebSocket closed due to authentication issue, attempting token refresh...');
        
        try {
          // Attempt to refresh the token
          const refreshToken = await AsyncStorage.getItem('refresh_token');
          if (refreshToken) {
            const response = await fetch(`https://api.propertpro.com/api/users/refresh/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh: refreshToken }),
            });
            
            if (response.ok) {
              const data = await response.json();
              // Store new tokens
              await AsyncStorage.setItem('access_token', data.access_token);
              await AsyncStorage.setItem('refresh_token', data.refresh_token);
              console.log('Token refreshed successfully, reconnecting...');
              
              // Clear any existing reconnect timeout
              if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
              
              // Reconnect immediately with new token
              reconnectTimeout.current = setTimeout(openSocket, 1000);
              return;
            }
          }
        } catch (error) {
          console.warn('Token refresh failed:', error);
        }
      }
      
      // schedule reconnect
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(openSocket, 5_000);
    };

    ws.current.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      switch (data.type) {
        case 'chat.message': {
          const msg: Message = data.message;
          
          // Handle our own messages (to replace optimistic messages)
          if (msg.sender === user?.id) {
            console.log('Processing own message from server:', msg.id);
            
            // Replace any optimistic message with the real one
            setMessages((prev) => {
              const list = prev[msg.thread_id] ?? [];
              
              // Check if we already have this exact message (prevent duplicates)
              if (list.some((m) => m.id === msg.id)) {
                console.log('Message already exists, skipping duplicate');
                return prev;
              }
              
              // Find and replace optimistic message, or add new message
              const hasOptimistic = list.some((m) => m.id.startsWith('temp_'));
              
              if (hasOptimistic) {
                console.log('Replacing optimistic message with real message');
                // Replace optimistic message with real message
                return {
                  ...prev,
                  [msg.thread_id]: list.map((m) => 
                    m.id.startsWith('temp_') ? msg : m
                  ),
                };
              } else {
                console.log('Adding new message (no optimistic message to replace)');
                // No optimistic message to replace, just add the new message
                return { ...prev, [msg.thread_id]: [...list, msg] };
              }
            });
            
            // Update thread timestamp but don't increment unread count for own messages
            setThreads((prev) =>
              [...prev]
                .map((t) => {
                  if (t.id === msg.thread_id) {
                    return {
                      ...t,
                      updated_at: msg.created_at,
                      // Don't increment unread_count for own messages
                    };
                  }
                  return t;
                })
                .sort(
                  (a, b) =>
                    new Date(b.updated_at).getTime() -
                    new Date(a.updated_at).getTime()
                )
            );
            break;
          }
          
          // Handle messages from other users
          // append into messages
          setMessages((prev) => {
            const list = prev[msg.thread_id] ?? [];
            if (list.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [msg.thread_id]: [...list, msg] };
          });
          // bump thread up and update unread count
          setThreads((prev) =>
            [...prev]
              .map((t) => {
                if (t.id === msg.thread_id) {
                  // This is a message from another user, increment unread count
                  return {
                    ...t,
                    updated_at: msg.created_at,
                    unread_count: (t.unread_count || 0) + 1,
                  };
                }
                return t;
              })
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime()
              )
          );
          break;
        }

        case 'typing.indicator': {
          if (data.user_id !== user?.id) {
            setTypingUsers((t) => ({
              ...t,
              [data.thread_id]: data.is_typing,
            }));
          }
          break;
        }

        case 'user.status': {
          setUserStatuses((s) => ({
            ...s,
            [data.user_id]: data.status,
          }));
          break;
        }

        case 'message.read': {
          setMessages((prev) => {
            if (!prev[data.thread_id]) return prev;
            return {
              ...prev,
              [data.thread_id]: prev[data.thread_id].map((m) =>
                data.message_ids.includes(m.id)
                  ? { ...m, read_at: data.read_at }
                  : m
              ),
            };
          });
          break;
        }

        case 'message.unsent': {
          setMessages((prev) => {
            if (!prev[data.thread_id]) return prev;
            return {
              ...prev,
              [data.thread_id]: prev[data.thread_id].map((m) =>
                m.id === data.message_id
                  ? { ...m, content: 'Message Unsent', is_unsent: true }
                  : m
              ),
            };
          });
          break;
        }
      }
    };
  }, [user?.id]);

  useEffect(() => {
    // Only fetch threads and open socket if user is authenticated
    if (user) {
      // initial fetch + open socket
      apiClient.get<Thread[]>('chat/').then((r) => setThreads(r.data));
      openSocket();
    }

    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      ws.current?.close();
    };
  }, [user, openSocket]);

  const getOrCreateThread = useCallback(
    async (sellerId: number, propertyId: number | null, title?: string) => {
      const existing = threads.find(
        (t) =>
          t.property === propertyId &&
          [t.user1, t.user2].includes(sellerId)
      );
      if (existing) return existing.id;

      const res = await apiClient.post<Thread>('chat/', {
        recipient_id: sellerId,
        property_id: propertyId,
        title,
      });
      setThreads((t) => [res.data, ...t]);
      return res.data.id;
    },
    [threads]
  );

  const getOrCreateDmThread = useCallback(
    async (otherId: number) => {
      const existing = threads.find(
        (t) =>
          !t.property &&
          ((t.user1 === otherId && t.user2 === user?.id) ||
            (t.user2 === otherId && t.user1 === user?.id))
      );
      if (existing) return existing.id;

      const res = await apiClient.post<Thread>('chat/', {
        recipient_id: otherId,
      });
      setThreads((t) => [res.data, ...t]);
      return res.data.id;
    },
    [threads, user?.id]
  );

  const sendMessage = useCallback(
    async (
      threadId: string,
      recipientId: number,
      content: string,
      propertyId?: number
    ): Promise<void> => {
      // Validation
      if (!threadId) {
        console.error('sendMessage: threadId is required');
        throw new Error('threadId is required');
      }
      
      if (!recipientId) {
        console.error('sendMessage: recipientId is required');
        throw new Error('recipientId is required');
      }
      
      if (!content || typeof content !== 'string') {
        console.error('sendMessage: content must be a non-empty string');
        throw new Error('content must be a non-empty string');
      }
      
      openSocket();
      
      // Create optimistic message for immediate UI update
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}_${Math.random()}`, // Temporary ID
        thread_id: threadId,
        property_id: propertyId || null,
        sender: user?.id || 0,
        recipient: recipientId,
        content,
        created_at: new Date().toISOString(),
        read_at: null,
        is_unsent: false,
        unsent_at: null,
      };

      // Add optimistic message to UI immediately
      setMessages((prev) => {
        const list = prev[threadId] ?? [];
        return {
          ...prev,
          [threadId]: [...list, optimisticMessage],
        };
      });

      // Update thread timestamp (but don't increment unread count for own messages)
      setThreads((prev) => {
        const updated = prev.map((t) => {
          if (t.id === threadId) {
            return {
              ...t,
              updated_at: optimisticMessage.created_at,
              // Don't increment unread_count for own messages
            };
          }
          return t;
        });
        return updated.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
      
      const payload: any = {
        type: 'chat.message',
        recipient_id: recipientId,
        content,
      };
      if (propertyId) payload.property_id = propertyId;

      if (ws.current?.readyState === WebSocket.OPEN) {
        // For WebSocket, we send and assume success (real-time)
        // The server will send the message back to confirm, which will replace the optimistic message
        ws.current.send(JSON.stringify(payload));
        return Promise.resolve();
      } else {
        // For REST API, we wait for the response and replace optimistic message
        try {
          const response = await apiClient.post<Message>(`chat/${threadId}/messages/`, {
            content,
            property_id: propertyId,
            recipient_id: recipientId,
          });
          
          // Replace optimistic message with real message from server
          setMessages((prev) => {
            const list = prev[threadId] ?? [];
            return {
              ...prev,
              [threadId]: list.map((msg) => 
                msg.id === optimisticMessage.id ? response.data : msg
              ),
            };
          });
          
          return Promise.resolve();
        } catch (error) {
          console.error('Failed to send message:', error);
          // Remove optimistic message on error
          setMessages((prev) => {
            const list = prev[threadId] ?? [];
            return {
              ...prev,
              [threadId]: list.filter((msg) => msg.id !== optimisticMessage.id),
            };
          });
          throw error;
        }
      }
    },
    [openSocket, user?.id]
  );

  const markThreadRead = useCallback(
    (threadId: string) => {
      setMessages((prev) => {
        if (!prev[threadId]) return prev;
        return {
          ...prev,
          [threadId]: prev[threadId].map((m) =>
            !m.read_at && m.sender !== user?.id
              ? { ...m, read_at: new Date().toISOString() }
              : m
          ),
        };
      });
      
      // Update threads state to reflect the new unread count
      setThreads((prev) => {
        return prev.map((thread) => {
          if (thread.id === threadId) {
            // Calculate new unread count based on unread messages
            const threadMessages = messages[threadId] || [];
            const newUnreadCount = threadMessages.filter(
              (msg) => msg.sender !== user?.id && !msg.read_at
            ).length;
            
            return {
              ...thread,
              unread_count: newUnreadCount,
            };
          }
          return thread;
        });
      });
      
      apiClient.post(`chat/${threadId}/mark_read/`).catch(() => {});
    },
    [user?.id, messages]
  );

  const sendTypingStart = useCallback((threadId: string, recipientId: number) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'typing.start',
          thread_id: threadId,
          recipient_id: recipientId,
        })
      );
    }
  }, []);

  const sendTypingStop = useCallback((threadId: string, recipientId: number) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'typing.stop',
          thread_id: threadId,
          recipient_id: recipientId,
        })
      );
    }
  }, []);

  const unsendMessage = useCallback(async (messageId: string) => {
    await apiClient.post(`chat/messages/${messageId}/unsend/`);
    ws.current?.send(JSON.stringify({ type: 'message.unsend', message_id: messageId }));
  }, []);

  const recalculateUnreadCounts = useCallback(() => {
    setThreads((prev) =>
      prev.map((thread) => {
        const threadMessages = messages[thread.id] || [];
        const newUnreadCount = threadMessages.filter(
          (msg) => msg.sender !== user?.id && !msg.read_at
        ).length;
        return {
          ...thread,
          unread_count: newUnreadCount,
        };
      })
    );
  }, [messages, user?.id]);

  return (
    <ChatContext.Provider
      value={{
        threads,
        messages,
        setMessages,
        getOrCreateThread,
        getOrCreateDmThread,
        sendMessage,
        markThreadRead,
        sendTypingStart,
        sendTypingStop,
        unsendMessage,
        typingUsers,
        userStatuses,
        recalculateUnreadCounts,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
};
