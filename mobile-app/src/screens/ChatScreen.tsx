import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { getMessages, sendMessage, translateMessage, markMessagesRead } from '../api/chat';
import { Message, Conversation } from '../types';

interface Props {
  conversation: Conversation;
  userId: string;
  userRole: string;
  onBack?: () => void;
}

// ── Contact mask rendering ────────────────────────────────────────────────────
const renderBody = (body: string, isMe: boolean) => {
  const parts = body.split('[contact hidden]');
  return parts.map((part, i) =>
    i < parts.length - 1 ? (
      <React.Fragment key={i}>
        <Text style={isMe ? styles.bodyTextMe : styles.bodyText}>{part}</Text>
        <Text style={styles.maskToken}> 🔒 </Text>
      </React.Fragment>
    ) : (
      <Text key={i} style={isMe ? styles.bodyTextMe : styles.bodyText}>{part}</Text>
    ),
  );
};

// ── Single message bubble ─────────────────────────────────────────────────────
interface BubbleProps {
  message: Message;
  isMe: boolean;
  onTranslate: (msg: Message, lang: 'ur' | 'en') => void;
  translatingId: string | null;
}

const Bubble: React.FC<BubbleProps> = ({ message, isMe, onTranslate, translatingId }) => {
  const [showUrdu, setShowUrdu] = useState(false);
  const isTranslating = translatingId === message.id;

  const displayBody = showUrdu && message.body_ur ? message.body_ur : (message.body ?? '');

  return (
    <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperThem]}>
      {/* Sender label */}
      {!isMe && (
        <Text style={styles.senderLabel}>{message.sender_name}</Text>
      )}

      {/* Bubble */}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {/* Voice message */}
        {message.type === 'voice' && (
          <View style={styles.voiceRow}>
            <Text style={styles.voiceIcon}>🎙️</Text>
            <Text style={[styles.voiceText, isMe && { color: '#bfdbfe' }]}>Voice message</Text>
          </View>
        )}

        {/* Image message */}
        {message.type === 'image' && (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageText}>🖼️ Image attachment</Text>
            {message.attachment_url && (
              <Text style={[styles.attachUrl, isMe && { color: '#bfdbfe' }]} numberOfLines={1}>
                {message.attachment_url}
              </Text>
            )}
          </View>
        )}

        {/* Text */}
        {(message.type === 'text' || message.type === 'system') && displayBody ? (
          <Text style={[styles.bodyText, isMe && styles.bodyTextMe, showUrdu && { textAlign: 'right' }]}>
            {displayBody.includes('[contact hidden]')
              ? renderBody(displayBody, isMe)
              : displayBody}
          </Text>
        ) : null}
      </View>

      {/* Meta row */}
      <View style={[styles.metaRow, isMe && { justifyContent: 'flex-end' }]}>
        <Text style={styles.timeText}>
          {new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {message.is_masked && <Text style={styles.maskedIcon}> 🔒</Text>}

        {message.type === 'text' && message.body && (
          <>
            {message.body_ur && (
              <TouchableOpacity onPress={() => setShowUrdu(!showUrdu)} style={styles.metaBtn}>
                <Text style={styles.metaBtnText}>{showUrdu ? 'EN' : 'اردو'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => onTranslate(message, 'ur')}
              disabled={isTranslating}
              style={styles.metaBtn}
            >
              <Text style={styles.metaBtnText}>
                {isTranslating ? '…' : (message.body_ur ? '🔄' : '🌐')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// ── Main Chat Screen ──────────────────────────────────────────────────────────
export const ChatScreen: React.FC<Props> = ({ conversation, userId, userRole, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachType, setAttachType] = useState<'image' | 'voice'>('image');
  const [error, setError] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await getMessages(conversation.id);
      setMessages(msgs);
      await markMessagesRead(conversation.id, userId);
    } catch {
      setError('Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversation.id, userId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Scroll to end on new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      const msg = await sendMessage(conversation.id, {
        sender_id: userId,
        sender_role: userRole,
        type: 'text',
        body: text,
      });
      setMessages((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        map.set(msg.id, msg);
        return Array.from(map.values());
      });
      setText('');
    } catch {
      setError('Failed to send.');
    } finally {
      setSending(false);
    }
  };

  const handleAttachSend = async () => {
    if (!attachUrl.trim()) return;
    setSending(true);
    setError('');
    try {
      const msg = await sendMessage(conversation.id, {
        sender_id: userId,
        sender_role: userRole,
        type: attachType,
        attachment_url: attachUrl,
        attachment_type: attachType === 'image' ? 'image/jpeg' : 'audio/ogg',
      });
      setMessages((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        map.set(msg.id, msg);
        return Array.from(map.values());
      });
      setAttachUrl('');
      setShowAttach(false);
    } catch {
      setError('Failed to send attachment.');
    } finally {
      setSending(false);
    }
  };

  const handleTranslate = async (msg: Message, lang: 'ur' | 'en') => {
    setTranslatingId(msg.id);
    try {
      const translated = await translateMessage(msg.id, lang);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, body_ur: translated } : m)),
      );
    } catch {
      Alert.alert('Translation', 'Translation failed. Check your connection.');
    } finally {
      setTranslatingId(null);
    }
  };

  const partnerName = userRole === 'buyer'
    ? conversation.supplier_name
    : conversation.buyer_name;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>💬 {partnerName ?? 'Chat'}</Text>
          {conversation.subject && (
            <Text style={styles.headerSub}>{conversation.subject}</Text>
          )}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          renderItem={({ item }) => (
            <Bubble
              message={item}
              isMe={item.sender_id === userId}
              onTranslate={handleTranslate}
              translatingId={translatingId}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No messages yet. Say hello! 👋</Text>
            </View>
          }
        />
      )}

      {/* Error */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Attach panel */}
      {showAttach && (
        <View style={styles.attachPanel}>
          <View style={styles.attachTypeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, attachType === 'image' && styles.typeBtnActive]}
              onPress={() => setAttachType('image')}
            >
              <Text style={[styles.typeBtnText, attachType === 'image' && styles.typeBtnTextActive]}>
                🖼️ Image URL
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, attachType === 'voice' && styles.typeBtnActive]}
              onPress={() => setAttachType('voice')}
            >
              <Text style={[styles.typeBtnText, attachType === 'voice' && styles.typeBtnTextActive]}>
                🎙️ Voice URL
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.attachRow}>
            <TextInput
              style={styles.attachInput}
              placeholder="Paste URL…"
              value={attachUrl}
              onChangeText={setAttachUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!attachUrl || sending) && styles.sendBtnDisabled]}
              onPress={handleAttachSend}
              disabled={!attachUrl || sending}
            >
              <Text style={styles.sendBtnText}>{sending ? '…' : '→'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Contact mask notice */}
      <View style={styles.maskNotice}>
        <Text style={styles.maskNoticeText}>
          🔒 Contact info is automatically hidden to prevent fraud.
        </Text>
      </View>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachToggle}
          onPress={() => setShowAttach(!showAttach)}
        >
          <Text style={styles.attachToggleText}>📎</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type in English or اردو…"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendBtnText}>{sending ? '…' : '→'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 20, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyText: { color: '#6b7280', fontSize: 14 },
  messageList: { flex: 1, backgroundColor: '#f9fafb' },
  messageContent: { padding: 16, paddingBottom: 8 },
  bubbleWrapper: { marginBottom: 12 },
  bubbleWrapperMe: { alignItems: 'flex-end' },
  bubbleWrapperThem: { alignItems: 'flex-start' },
  senderLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 3, marginLeft: 4 },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 14,
  },
  bubbleMe: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderBottomLeftRadius: 4 },
  bodyText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  bodyTextMe: { color: '#fff' },
  maskToken: { color: '#f87171', fontWeight: '700' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceIcon: { fontSize: 18 },
  voiceText: { fontSize: 13, color: '#374151' },
  imagePlaceholder: { gap: 4 },
  imageText: { fontSize: 13, color: '#374151' },
  attachUrl: { fontSize: 11, color: '#6b7280' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6, paddingHorizontal: 4 },
  timeText: { fontSize: 10, color: '#9ca3af' },
  maskedIcon: { fontSize: 10, color: '#f87171' },
  metaBtn: { paddingHorizontal: 4 },
  metaBtnText: { fontSize: 11, color: '#9ca3af' },
  errorText: { color: '#dc2626', fontSize: 12, padding: 8, textAlign: 'center', backgroundColor: '#fee2e2' },
  attachPanel: { backgroundColor: '#f0f9ff', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 12, gap: 8 },
  attachTypeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  typeBtnText: { fontSize: 13, color: '#6b7280' },
  typeBtnTextActive: { color: '#2563eb', fontWeight: '600' },
  attachRow: { flexDirection: 'row', gap: 8 },
  attachInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  maskNotice: { backgroundColor: '#fefce8', padding: 6, borderTopWidth: 1, borderTopColor: '#fde68a' },
  maskNoticeText: { fontSize: 10, color: '#92400e', textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachToggle: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachToggleText: { fontSize: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
    backgroundColor: '#fff',
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#93c5fd' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
