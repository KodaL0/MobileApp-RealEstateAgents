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
  ) => void;
  markThreadRead: (threadId: string) => void;
  sendTypingStart: (threadId: string, recipientId: number) => void;
  sendTypingStop: (threadId: string, recipientId: number) => void;
  unsendMessage: (messageId: string) => Promise<void>;
  typingUsers: Record<string, boolean>;
  userStatuses: Record<number, 'online' | 'offline'>;
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
    ws.current.onclose = () => {
      // cleanup ping
      if (pingRef.current) clearInterval(pingRef.current);
      ws.current = null;
      // schedule reconnect
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(openSocket, 5_000);
    };

    ws.current.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      switch (data.type) {
        case 'chat.message': {
          const msg: Message = data.message;
          // append into messages
          setMessages((prev) => {
            const list = prev[msg.thread_id] ?? [];
            if (list.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [msg.thread_id]: [...list, msg] };
          });
          // bump thread up
          setThreads((prev) =>
            [...prev]
              .map((t) =>
                t.id === msg.thread_id
                  ? { ...t, updated_at: msg.created_at }
                  : t
              )
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
  }, [openSocket, user]);

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
    (
      threadId: string,
      recipientId: number,
      content: string,
      propertyId?: number
    ) => {
      openSocket();
      const payload: any = {
        type: 'chat.message',
        recipient_id: recipientId,
        content,
      };
      if (propertyId) payload.property_id = propertyId;

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(payload));
      } else {
        apiClient.post(`chat/${threadId}/messages/`, {
          content,
          property_id: propertyId,
          recipient_id: recipientId,
        });
      }
    },
    [openSocket]
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
      apiClient.post(`chat/${threadId}/mark_read/`).catch(() => {});
    },
    [user?.id]
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
