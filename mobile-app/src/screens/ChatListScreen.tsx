import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { listConversations } from '../api/chat';
import { Conversation } from '../types';

interface Props {
  userId: string;
  role: string;
  onSelectConversation?: (conversation: Conversation) => void;
}

export const ChatListScreen: React.FC<Props> = ({ userId, role, onSelectConversation }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listConversations(userId, role)
      .then(setConversations)
      .catch(() => setError('Failed to load conversations.'))
      .finally(() => setLoading(false));
  }, [userId, role]);

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading messages…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Messages</Text>
        <Text style={styles.unreadBadge}>
          {totalUnread > 0 ? `${totalUnread} unread` : '✓ All read'}
        </Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No conversations yet.</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation by contacting a supplier about your RFQ.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: c }) => {
            const partnerName = role === 'buyer' ? c.supplier_name : c.buyer_name;
            const hasUnread = (c.unread_count ?? 0) > 0;
            return (
              <TouchableOpacity
                style={[styles.card, hasUnread && styles.cardUnread]}
                onPress={() => onSelectConversation?.(c)}
                activeOpacity={0.7}
              >
                {/* Unread dot */}
                {hasUnread && <View style={styles.unreadDot} />}

                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.partnerName, hasUnread && styles.partnerNameUnread]}>
                      {partnerName ?? 'Contact'}
                    </Text>
                    <View style={styles.topRight}>
                      {hasUnread && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{c.unread_count}</Text>
                        </View>
                      )}
                      {c.last_message_at && (
                        <Text style={styles.timeText}>
                          {new Date(c.last_message_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </View>
                  </View>

                  {c.subject && (
                    <Text style={styles.subject}>📦 {c.subject}</Text>
                  )}

                  {c.last_message ? (
                    <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
                      {c.last_message}
                    </Text>
                  ) : (
                    <Text style={styles.preview}>Tap to start chatting →</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  errorText: { color: '#dc2626', textAlign: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  unreadBadge: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: '#2563eb' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginRight: 10,
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  partnerName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  partnerNameUnread: { fontWeight: '800', color: '#111827' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  timeText: { fontSize: 11, color: '#9ca3af' },
  subject: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  preview: { fontSize: 13, color: '#9ca3af' },
  previewUnread: { color: '#374151', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});
