import { Router } from 'express';
import {
  createConversation,
  listConversations,
  getConversation,
  getMessages,
  sendMessage,
  markMessagesRead,
  translateMessage,
  streamMessages,
} from '../controllers/chatController';

const router = Router();

// Conversations
router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);

// Messages
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.patch('/conversations/:id/messages/read', markMessagesRead);
router.get('/conversations/:id/stream', streamMessages);

// Translation
router.post('/translate', translateMessage);

export default router;
