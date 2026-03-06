import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { Rfq, CreateRfqBody } from '../models/types';
import { AppError } from '../middleware/errorHandler';

/** POST /api/rfqs — create a new RFQ */
export const createRfq = async (
  req: Request<object, object, CreateRfqBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { buyer_id, product_id, product_name, quantity, city, description, images } = req.body;

    if (!buyer_id || !product_name || !quantity || !city) {
      const err: AppError = new Error('buyer_id, product_name, quantity, and city are required');
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Rfq>(
      `INSERT INTO rfqs (buyer_id, product_id, product_name, quantity, city, description, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [buyer_id, product_id || null, product_name, quantity, city, description || null, images || []],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** GET /api/rfqs — list all RFQs (optionally filter by status / city) */
export const listRfqs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, city, buyer_id } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status) { conditions.push(`r.status = $${idx++}`); values.push(status); }
    if (city)   { conditions.push(`r.city ILIKE $${idx++}`); values.push(`%${city}%`); }
    if (buyer_id) { conditions.push(`r.buyer_id = $${idx++}`); values.push(buyer_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query<Rfq>(
      `SELECT r.*, u.name AS buyer_name
         FROM rfqs r
         JOIN users u ON u.id = r.buyer_id
         ${where}
        ORDER BY r.created_at DESC`,
      values,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/rfqs/:id — get single RFQ with linked pool info */
export const getRfq = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query<Rfq>(
      `SELECT r.*, u.name AS buyer_name
         FROM rfqs r
         JOIN users u ON u.id = r.buyer_id
        WHERE r.id = $1`,
      [id],
    );

    if (!rows.length) {
      const err: AppError = new Error('RFQ not found');
      err.statusCode = 404;
      return next(err);
    }

    // Attach associated pool if any
    const { rows: poolRows } = await pool.query(
      `SELECT p.*,
              ROUND((p.current_quantity::numeric / p.moq) * 100, 1) AS progress_pct,
              COUNT(pm.id) AS member_count
         FROM pools p
         LEFT JOIN pool_members pm ON pm.pool_id = p.id
        WHERE p.rfq_id = $1
        GROUP BY p.id`,
      [id],
    );

    res.json({ success: true, data: { ...rows[0], pool: poolRows[0] || null } });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/rfqs/:id — update RFQ status */
export const updateRfqStatus = async (
  req: Request<{ id: string }, object, { status: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['open', 'pooled', 'confirmed', 'cancelled'];
    if (!allowed.includes(status)) {
      const err: AppError = new Error(`Invalid status. Allowed: ${allowed.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Rfq>(
      `UPDATE rfqs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );

    if (!rows.length) {
      const err: AppError = new Error('RFQ not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
