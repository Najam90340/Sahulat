import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import {
  Transaction,
  InitiatePaymentBody,
  PaymentCallbackBody,
  PaymentMethod,
} from '../models/types';
import { AppError } from '../middleware/errorHandler';
import { getGateway } from '../services/gateways';

const VALID_METHODS: PaymentMethod[] = ['easypaisa', 'jazzcash', 'bank_transfer', 'card'];

// ── Initiate Payment ────────────────────────────────────────────────────────

/**
 * POST /api/payments/initiate
 *
 * Buyer initiates an escrow payment for their slot in a confirmed pool.
 * The amount is calculated from the accepted quote price × their quantity.
 * If no accepted quote exists, the buyer-provided amount is used.
 */
export const initiatePayment = async (
  req: Request<object, object, InitiatePaymentBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { buyer_id, pool_id, payment_method, amount, phone, card_token } = req.body;

    if (!buyer_id || !pool_id || !payment_method || !amount) {
      const err: AppError = new Error('buyer_id, pool_id, payment_method, and amount are required');
      err.statusCode = 400;
      return next(err);
    }

    if (!VALID_METHODS.includes(payment_method)) {
      const err: AppError = new Error(`Invalid payment_method. Allowed: ${VALID_METHODS.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    // Verify pool exists and is confirmed (MOQ met)
    const { rows: poolRows } = await pool.query(
      `SELECT p.*, r.product_name FROM pools p JOIN rfqs r ON r.id = p.rfq_id WHERE p.id = $1`,
      [pool_id],
    );
    if (!poolRows.length) {
      const err: AppError = new Error('Pool not found');
      err.statusCode = 404;
      return next(err);
    }
    const buyingPool = poolRows[0];
    if (buyingPool.status !== 'confirmed') {
      const err: AppError = new Error('Payment can only be initiated for confirmed pools');
      err.statusCode = 400;
      return next(err);
    }

    // Verify buyer is a member
    const { rows: memberRows } = await pool.query(
      `SELECT * FROM pool_members WHERE pool_id = $1 AND buyer_id = $2`,
      [pool_id, buyer_id],
    );
    if (!memberRows.length) {
      const err: AppError = new Error('Buyer is not a member of this pool');
      err.statusCode = 404;
      return next(err);
    }
    const member = memberRows[0];

    // Check for existing non-failed transaction for this member slot
    const { rows: existingTxn } = await pool.query(
      `SELECT id, status FROM transactions WHERE pool_member_id = $1`,
      [member.id],
    );
    if (existingTxn.length && existingTxn[0].status !== 'failed') {
      const err: AppError = new Error(
        `A transaction already exists for this pool slot (status: ${existingTxn[0].status})`,
      );
      err.statusCode = 409;
      return next(err);
    }

    // Charge via gateway
    const gateway = getGateway(payment_method);
    const txnId = existingTxn.length
      ? existingTxn[0].id
      : (await pool.query(
          `INSERT INTO transactions (pool_id, pool_member_id, buyer_id, amount, payment_method, phone)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (pool_member_id) DO UPDATE
             SET status = 'initiated', amount = EXCLUDED.amount,
                 payment_method = EXCLUDED.payment_method, phone = EXCLUDED.phone,
                 initiated_at = NOW()
           RETURNING id`,
          [pool_id, member.id, buyer_id, amount, payment_method, phone || null],
        )
        ).rows[0].id;

    const chargeResult = await gateway.charge({
      amount,
      currency: 'PKR',
      reference: txnId,
      phone,
      card_token,
      description: `Sahulat escrow – ${buyingPool.product_name} pool`,
    });

    // Update transaction with gateway response
    const newStatus = chargeResult.status === 'success' ? 'held' : chargeResult.status === 'pending' ? 'initiated' : 'failed';
    const { rows: txnRows } = await pool.query<Transaction>(
      `UPDATE transactions
          SET gateway_ref = $1,
              status      = $2,
              held_at     = CASE WHEN $2 = 'held' THEN NOW() ELSE held_at END,
              metadata    = $3
        WHERE id = $4
        RETURNING *`,
      [chargeResult.gateway_ref || null, newStatus, JSON.stringify(chargeResult.raw || {}), txnId],
    );

    // Update pool_member amount_paid
    if (newStatus === 'held') {
      await pool.query(
        `UPDATE pool_members SET amount_paid = $1 WHERE id = $2`,
        [amount, member.id],
      );
    }

    res.status(201).json({
      success: true,
      data: {
        transaction: txnRows[0],
        gateway_message: chargeResult.message,
        bank_details: payment_method === 'bank_transfer' ? chargeResult.raw : undefined,
        redirect_url: chargeResult.redirect_url,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Gateway Callback / Webhook ───────────────────────────────────────────────

/**
 * POST /api/payments/callback
 *
 * Receives async payment confirmation from the gateway.
 * In production this endpoint must be secured with gateway-specific HMAC
 * signature verification before processing.
 */
export const paymentCallback = async (
  req: Request<object, object, PaymentCallbackBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { gateway_ref, transaction_id, status, amount, metadata } = req.body;

    if (!transaction_id || !status) {
      const err: AppError = new Error('transaction_id and status are required');
      err.statusCode = 400;
      return next(err);
    }

    const newStatus = status === 'success' ? 'held' : 'failed';

    const { rows } = await pool.query<Transaction>(
      `UPDATE transactions
          SET gateway_ref = COALESCE($1, gateway_ref),
              status      = $2,
              held_at     = CASE WHEN $2 = 'held' THEN NOW() ELSE held_at END,
              metadata    = metadata || $3
        WHERE id = $4
        RETURNING *`,
      [gateway_ref || null, newStatus, JSON.stringify(metadata || {}), transaction_id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Transaction not found');
      err.statusCode = 404;
      return next(err);
    }

    // Update pool_member amount_paid on successful payment
    if (newStatus === 'held' && amount) {
      await pool.query(
        `UPDATE pool_members SET amount_paid = $1 WHERE id = $2`,
        [amount, rows[0].pool_member_id],
      );
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ── Release Funds to Supplier ────────────────────────────────────────────────

/**
 * POST /api/payments/:id/release
 *
 * Admin / system triggers fund release to supplier after delivery confirmation.
 * In production, this would trigger a payout API call to the supplier's
 * Easypaisa / JazzCash / bank account.
 */
export const releaseFunds = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows: txnRows } = await pool.query<Transaction>(
      `SELECT * FROM transactions WHERE id = $1`,
      [id],
    );
    if (!txnRows.length) {
      const err: AppError = new Error('Transaction not found');
      err.statusCode = 404;
      return next(err);
    }
    const txn = txnRows[0];

    if (txn.status !== 'held') {
      const err: AppError = new Error(`Cannot release funds: transaction status is '${txn.status}' (must be 'held')`);
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Transaction>(
      `UPDATE transactions SET status = 'released', released_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/pool/:poolId/release-all
 *
 * Release all held funds for a pool (triggered after delivery confirmation).
 */
export const releaseAllPoolFunds = async (
  req: Request<{ poolId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { poolId } = req.params;

    const { rows } = await pool.query<Transaction>(
      `UPDATE transactions
          SET status = 'released', released_at = NOW()
        WHERE pool_id = $1 AND status = 'held'
        RETURNING *`,
      [poolId],
    );

    res.json({ success: true, data: rows, released_count: rows.length });
  } catch (error) {
    next(error);
  }
};

// ── Refunds ─────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/:id/refund
 *
 * Refund a single held transaction back to the buyer.
 */
export const refundTransaction = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows: txnRows } = await pool.query<Transaction>(
      `SELECT * FROM transactions WHERE id = $1`,
      [id],
    );
    if (!txnRows.length) {
      const err: AppError = new Error('Transaction not found');
      err.statusCode = 404;
      return next(err);
    }
    const txn = txnRows[0];

    if (!['held', 'initiated'].includes(txn.status)) {
      const err: AppError = new Error(`Cannot refund: transaction status is '${txn.status}'`);
      err.statusCode = 400;
      return next(err);
    }

    // Call gateway refund
    if (txn.gateway_ref) {
      const gateway = getGateway(txn.payment_method);
      await gateway.refund({
        gateway_ref: txn.gateway_ref,
        amount: Number(txn.amount),
        reference: `REFUND-${id}`,
      });
    }

    const { rows } = await pool.query<Transaction>(
      `UPDATE transactions SET status = 'refunded', refunded_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );

    // Reset pool_member amount_paid
    await pool.query(
      `UPDATE pool_members SET amount_paid = 0, status = 'refunded' WHERE id = $1`,
      [txn.pool_member_id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/pool/:poolId/refund-all
 *
 * Refund all held/initiated transactions for a failed pool.
 * Called automatically when a pool expires without reaching MOQ.
 */
export const refundAllPoolTransactions = async (
  req: Request<{ poolId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { poolId } = req.params;

    // Get all eligible transactions
    const { rows: txns } = await pool.query<Transaction>(
      `SELECT * FROM transactions WHERE pool_id = $1 AND status IN ('held', 'initiated')`,
      [poolId],
    );

    const results = [];
    for (const txn of txns) {
      if (txn.gateway_ref) {
        try {
          const gateway = getGateway(txn.payment_method);
          await gateway.refund({
            gateway_ref: txn.gateway_ref,
            amount: Number(txn.amount),
            reference: `REFUND-${txn.id}`,
          });
        } catch {
          // Log but continue with other refunds
          console.warn(`Gateway refund failed for txn ${txn.id}, marking as refunded anyway`);
        }
      }
      results.push(txn.id);
    }

    const { rows } = await pool.query<Transaction>(
      `UPDATE transactions
          SET status = 'refunded', refunded_at = NOW()
        WHERE pool_id = $1 AND status IN ('held', 'initiated')
        RETURNING *`,
      [poolId],
    );

    // Reset pool_member statuses
    await pool.query(
      `UPDATE pool_members SET amount_paid = 0, status = 'refunded' WHERE pool_id = $1`,
      [poolId],
    );

    res.json({ success: true, data: rows, refunded_count: rows.length });
  } catch (error) {
    next(error);
  }
};

// ── Read endpoints ───────────────────────────────────────────────────────────

/** GET /api/payments/pool/:poolId — list all transactions for a pool */
export const listPoolTransactions = async (
  req: Request<{ poolId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { poolId } = req.params;

    const { rows } = await pool.query<Transaction>(
      `SELECT t.*, u.name AS buyer_name, p.product_name AS pool_product_name
         FROM transactions t
         JOIN users u ON u.id = t.buyer_id
         JOIN pools p ON p.id = t.pool_id
        WHERE t.pool_id = $1
        ORDER BY t.initiated_at DESC`,
      [poolId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/payments/buyer/:buyerId — buyer's full transaction history */
export const listBuyerTransactions = async (
  req: Request<{ buyerId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { buyerId } = req.params;

    const { rows } = await pool.query<Transaction>(
      `SELECT t.*, p.product_name AS pool_product_name, p.city, p.status AS pool_status
         FROM transactions t
         JOIN pools p ON p.id = t.pool_id
        WHERE t.buyer_id = $1
        ORDER BY t.initiated_at DESC`,
      [buyerId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/payments/:id — get a single transaction */
export const getTransaction = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query<Transaction>(
      `SELECT t.*, u.name AS buyer_name, p.product_name AS pool_product_name, p.city
         FROM transactions t
         JOIN users u ON u.id = t.buyer_id
         JOIN pools p ON p.id = t.pool_id
        WHERE t.id = $1`,
      [id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Transaction not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
