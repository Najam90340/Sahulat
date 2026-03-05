import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import {
  Conversation,
  Message,
  CreateConversationBody,
  SendMessageBody,
  TranslateBody,
} from '../models/types';
import { AppError } from '../middleware/errorHandler';
import { maskContacts } from '../utils/contactMask';
import { translate } from '../utils/translator';

// ── Conversations ─────────────────────────────────────────────────────────────

/**
 * POST /api/chat/conversations
 *
 * Creates a conversation between a buyer and supplier, scoped to an RFQ / pool.
 * If a matching thread already exists it is returned (upsert-style).
 */
export const createConversation = async (
  req: Request<object, object, CreateConversationBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { buyer_id, supplier_id, rfq_id, pool_id, subject } = req.body;

    if (!buyer_id || !supplier_id) {
      const err: AppError = new Error('buyer_id and supplier_id are required');
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Conversation>(
      `INSERT INTO conversations (buyer_id, supplier_id, rfq_id, pool_id, subject)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (buyer_id, supplier_id, rfq_id)
         DO UPDATE SET updated_at = NOW(), is_active = TRUE
       RETURNING *`,
      [buyer_id, supplier_id, rfq_id || null, pool_id || null, subject || null],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/conversations — list conversations for a user
 * Query params: user_id (required), role ('buyer' | 'supplier')
 */
export const listConversations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user_id, role } = req.query as Record<string, string>;

    if (!user_id) {
      const err: AppError = new Error('user_id query param is required');
      err.statusCode = 400;
      return next(err);
    }

    const filterCol = role === 'supplier' ? 'c.supplier_id' : 'c.buyer_id';

    const { rows } = await pool.query<Conversation>(
      `SELECT c.*,
              b.name AS buyer_name,
              s.name AS supplier_name,
              r.product_name AS rfq_product,
              COUNT(m.id) FILTER (WHERE m.is_read = FALSE AND m.sender_id != $1)::int AS unread_count,
              (SELECT body FROM messages
                WHERE conversation_id = c.id
                ORDER BY sent_at DESC LIMIT 1) AS last_message,
              (SELECT sent_at FROM messages
                WHERE conversation_id = c.id
                ORDER BY sent_at DESC LIMIT 1) AS last_message_at
         FROM conversations c
         JOIN users b ON b.id = c.buyer_id
         JOIN users s ON s.id = c.supplier_id
         LEFT JOIN rfqs r ON r.id = c.rfq_id
         LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE ${filterCol} = $1
          AND c.is_active = TRUE
        GROUP BY c.id, b.name, s.name, r.product_name
        ORDER BY last_message_at DESC NULLS LAST`,
      [user_id],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/conversations/:id
 */
export const getConversation = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<Conversation>(
      `SELECT c.*,
              b.name AS buyer_name,
              s.name AS supplier_name,
              r.product_name AS rfq_product
         FROM conversations c
         JOIN users b ON b.id = c.buyer_id
         JOIN users s ON s.id = c.supplier_id
         LEFT JOIN rfqs r ON r.id = c.rfq_id
        WHERE c.id = $1`,
      [req.params.id],
    );
    if (!rows.length) {
      const err: AppError = new Error('Conversation not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ── Messages ──────────────────────────────────────────────────────────────────

/**
 * GET /api/chat/conversations/:id/messages
 */
export const getMessages = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<Message>(
      `SELECT m.*, u.name AS sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = $1
        ORDER BY m.sent_at ASC`,
      [req.params.id],
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chat/conversations/:id/messages
 *
 * Sends a message.  Contact information in the body is automatically masked
 * before storage (fraud-prevention).  Image / voice messages use attachment_url.
 */
export const sendMessage = async (
  req: Request<{ id: string }, object, SendMessageBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: conversation_id } = req.params;
    const {
      sender_id, sender_role, type = 'text',
      body, attachment_url, attachment_type,
    } = req.body;

    if (!sender_id || !sender_role) {
      const err: AppError = new Error('sender_id and sender_role are required');
      err.statusCode = 400;
      return next(err);
    }

    if (type === 'text' && !body) {
      const err: AppError = new Error('body is required for text messages');
      err.statusCode = 400;
      return next(err);
    }

    if ((type === 'image' || type === 'voice') && !attachment_url) {
      const err: AppError = new Error('attachment_url is required for image/voice messages');
      err.statusCode = 400;
      return next(err);
    }

    // Verify conversation exists and is active
    const { rows: convRows } = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND is_active = TRUE`,
      [conversation_id],
    );
    if (!convRows.length) {
      const err: AppError = new Error('Conversation not found or inactive');
      err.statusCode = 404;
      return next(err);
    }

    // ── Contact masking ────────────────────────────────────────────────────
    let finalBody = body ?? null;
    let wasMasked = false;
    if (finalBody) {
      const result = maskContacts(finalBody);
      finalBody = result.masked;
      wasMasked = result.wasMasked;
    }

    const { rows } = await pool.query<Message>(
      `INSERT INTO messages
         (conversation_id, sender_id, sender_role, type, body, attachment_url, attachment_type, is_masked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        conversation_id, sender_id, sender_role, type,
        finalBody, attachment_url || null, attachment_type || null, wasMasked,
      ],
    );

    // Bump conversation updated_at
    await pool.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversation_id],
    );

    // Fetch with sender name
    const { rows: full } = await pool.query<Message>(
      `SELECT m.*, u.name AS sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = $1`,
      [rows[0].id],
    );

    res.status(201).json({ success: true, data: full[0], was_masked: wasMasked });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/chat/conversations/:id/messages/read
 *
 * Marks all messages in a conversation as read for the given user.
 */
export const markMessagesRead = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user_id } = req.body as { user_id: string };
    if (!user_id) {
      const err: AppError = new Error('user_id is required');
      err.statusCode = 400;
      return next(err);
    }

    const { rowCount } = await pool.query(
      `UPDATE messages SET is_read = TRUE
        WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
      [req.params.id, user_id],
    );

    res.json({ success: true, updated: rowCount ?? 0 });
  } catch (error) {
    next(error);
  }
};

// ── Translation ───────────────────────────────────────────────────────────────

/**
 * POST /api/chat/translate
 *
 * Translates a message body.  Stores the Urdu translation on the message row
 * so subsequent fetches can return it without re-calling the API.
 */
export const translateMessage = async (
  req: Request<object, object, TranslateBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { message_id, target_lang } = req.body;

    if (!message_id || !target_lang) {
      const err: AppError = new Error('message_id and target_lang are required');
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Message>(
      `SELECT * FROM messages WHERE id = $1`,
      [message_id],
    );
    if (!rows.length) {
      const err: AppError = new Error('Message not found');
      err.statusCode = 404;
      return next(err);
    }

    const msg = rows[0];
    if (!msg.body) {
      const err: AppError = new Error('Message has no translatable body');
      err.statusCode = 400;
      return next(err);
    }

    // Return cached Urdu translation if available
    if (target_lang === 'ur' && msg.body_ur) {
      res.json({
        success: true,
        data: { original: msg.body, translated: msg.body_ur, target_lang, provider: 'cache' },
      });
      return;
    }

    const result = await translate(msg.body, target_lang);

    // Cache Urdu translation on the row
    if (target_lang === 'ur') {
      await pool.query(
        `UPDATE messages SET body_ur = $1 WHERE id = $2`,
        [result.translated, message_id],
      );
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ── SSE Real-time Stream ──────────────────────────────────────────────────────

/** How far back to look for messages when no `since` param is provided (ms) */
const DEFAULT_SSE_LOOKBACK_MS = 5_000;

/**
 * GET /api/chat/conversations/:id/stream
 *
 * Server-Sent Events stream.  Emits new messages as they arrive.
 * Polls the DB every 2 seconds for simplicity; in production replace with
 * PostgreSQL LISTEN/NOTIFY or a WebSocket gateway.
 */
export const streamMessages = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: conversation_id } = req.params;
    const sinceParam = req.query.since as string | undefined;
    let since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - DEFAULT_SSE_LOOKBACK_MS);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const poll = async (): Promise<void> => {
      const now = new Date();
      const { rows } = await pool.query<Message>(
        `SELECT m.*, u.name AS sender_name
           FROM messages m
           JOIN users u ON u.id = m.sender_id
          WHERE m.conversation_id = $1 AND m.sent_at > $2
          ORDER BY m.sent_at ASC`,
        [conversation_id, since.toISOString()],
      );
      if (rows.length) {
        for (const msg of rows) {
          res.write(`data: ${JSON.stringify(msg)}\n\n`);
        }
        since = now;
      }
    };

    await poll();
    const intervalId = setInterval(poll, 2000);
    req.on('close', () => { clearInterval(intervalId); res.end(); });
  } catch (error) {
    next(error);
  }
};
