import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { Pool as BuyingPool, PoolMember, CreatePoolBody, JoinPoolBody, PoolWithProgress } from '../models/types';
import { AppError } from '../middleware/errorHandler';
import { tryAutoConfirm, processExpiredPool } from '../services/poolService';

/** POST /api/pools — create a new buying pool from an RFQ */
export const createPool = async (
  req: Request<object, object, CreatePoolBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rfq_id, creator_id, moq, deadline } = req.body;

    if (!rfq_id || !creator_id || !moq) {
      const err: AppError = new Error('rfq_id, creator_id, and moq are required');
      err.statusCode = 400;
      return next(err);
    }

    // Fetch the RFQ to populate pool fields
    const { rows: rfqRows } = await pool.query(
      `SELECT * FROM rfqs WHERE id = $1`,
      [rfq_id],
    );
    if (!rfqRows.length) {
      const err: AppError = new Error('RFQ not found');
      err.statusCode = 404;
      return next(err);
    }
    const rfq = rfqRows[0];

    // Only allow pool creation if quantity < MOQ
    if (rfq.quantity >= moq) {
      const err: AppError = new Error('Pool not needed: RFQ quantity already meets or exceeds MOQ');
      err.statusCode = 400;
      return next(err);
    }

    // Check that no open pool already exists for this RFQ
    const { rows: existing } = await pool.query(
      `SELECT id FROM pools WHERE rfq_id = $1 AND status = 'open'`,
      [rfq_id],
    );
    if (existing.length) {
      const err: AppError = new Error('An open pool already exists for this RFQ');
      err.statusCode = 409;
      return next(err);
    }

    const deadlineVal = deadline || null;

    const { rows } = await pool.query<BuyingPool>(
      `INSERT INTO pools (rfq_id, creator_id, product_name, city, moq, current_quantity, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [rfq_id, creator_id, rfq.product_name, rfq.city, moq, rfq.quantity, deadlineVal],
    );
    const newPool = rows[0];

    // Auto-add the creator as the first pool member
    await pool.query(
      `INSERT INTO pool_members (pool_id, buyer_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (pool_id, buyer_id) DO NOTHING`,
      [newPool.id, creator_id, rfq.quantity],
    );

    // Mark RFQ as pooled
    await pool.query(
      `UPDATE rfqs SET status = 'pooled', updated_at = NOW() WHERE id = $1`,
      [rfq_id],
    );

    // Check if MOQ is already met (edge-case)
    const confirmed = await tryAutoConfirm(newPool.id);

    res.status(201).json({ success: true, data: confirmed ?? newPool });
  } catch (error) {
    next(error);
  }
};

/** GET /api/pools — list pools with optional filters */
export const listPools = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, city, product } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status)  { conditions.push(`p.status = $${idx++}`);              values.push(status); }
    if (city)    { conditions.push(`p.city ILIKE $${idx++}`);            values.push(`%${city}%`); }
    if (product) { conditions.push(`p.product_name ILIKE $${idx++}`);    values.push(`%${product}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query<PoolWithProgress>(
      `SELECT p.*,
              ROUND((p.current_quantity::numeric / p.moq) * 100, 1) AS progress_pct,
              COUNT(pm.id)::int AS member_count
         FROM pools p
         LEFT JOIN pool_members pm ON pm.pool_id = p.id
         ${where}
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
      values,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/pools/:id — get single pool with members and progress */
export const getPool = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Expire if past deadline before returning
    await processExpiredPool(id);

    const { rows } = await pool.query<PoolWithProgress>(
      `SELECT p.*,
              ROUND((p.current_quantity::numeric / p.moq) * 100, 1) AS progress_pct,
              COUNT(pm.id)::int AS member_count
         FROM pools p
         LEFT JOIN pool_members pm ON pm.pool_id = p.id
        WHERE p.id = $1
        GROUP BY p.id`,
      [id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Pool not found');
      err.statusCode = 404;
      return next(err);
    }

    // Fetch members with buyer info
    const { rows: members } = await pool.query(
      `SELECT pm.*, u.name AS buyer_name, u.city AS buyer_city
         FROM pool_members pm
         JOIN users u ON u.id = pm.buyer_id
        WHERE pm.pool_id = $1
        ORDER BY pm.joined_at`,
      [id],
    );

    res.json({ success: true, data: { ...rows[0], members } });
  } catch (error) {
    next(error);
  }
};

/** POST /api/pools/:id/join — buyer joins an existing pool */
export const joinPool = async (
  req: Request<{ id: string }, object, JoinPoolBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { buyer_id, quantity, amount_paid } = req.body;

    if (!buyer_id || !quantity) {
      const err: AppError = new Error('buyer_id and quantity are required');
      err.statusCode = 400;
      return next(err);
    }

    // Validate pool is open
    const { rows: poolRows } = await pool.query<BuyingPool>(
      `SELECT * FROM pools WHERE id = $1`,
      [id],
    );
    if (!poolRows.length) {
      const err: AppError = new Error('Pool not found');
      err.statusCode = 404;
      return next(err);
    }
    const buyingPool = poolRows[0];
    if (buyingPool.status !== 'open') {
      const err: AppError = new Error(`Pool is ${buyingPool.status} and cannot accept new members`);
      err.statusCode = 409;
      return next(err);
    }

    // Insert member (upsert)
    const { rows: memberRows } = await pool.query<PoolMember>(
      `INSERT INTO pool_members (pool_id, buyer_id, quantity, amount_paid)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (pool_id, buyer_id) DO UPDATE
          SET quantity    = EXCLUDED.quantity,
              amount_paid = EXCLUDED.amount_paid
       RETURNING *`,
      [id, buyer_id, quantity, amount_paid ?? 0],
    );

    // Refresh quantity and check auto-confirm
    const confirmed = await tryAutoConfirm(id);

    // Fetch latest pool state (confirmed if MOQ met, otherwise current state)
    let latestPool: BuyingPool;
    if (confirmed) {
      latestPool = confirmed;
    } else {
      const { rows: latestRows } = await pool.query<BuyingPool>(
        `SELECT * FROM pools WHERE id = $1`,
        [id],
      );
      latestPool = latestRows[0];
    }

    res.status(201).json({
      success: true,
      data: {
        member: memberRows[0],
        pool: latestPool,
        auto_confirmed: !!confirmed,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/pools/:id/progress — SSE real-time progress stream */
export const streamPoolProgress = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendProgress = async (): Promise<void> => {
      const { rows } = await pool.query(
        `SELECT current_quantity, moq, status,
                ROUND((current_quantity::numeric / moq) * 100, 1) AS progress_pct
           FROM pools WHERE id = $1`,
        [id],
      );
      if (rows.length) {
        res.write(`data: ${JSON.stringify(rows[0])}\n\n`);
      }
    };

    await sendProgress();
    const intervalId = setInterval(sendProgress, 3000);

    req.on('close', () => {
      clearInterval(intervalId);
      res.end();
    });
  } catch (error) {
    next(error);
  }
};
