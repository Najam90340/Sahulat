import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { Quote, SubmitQuoteBody } from '../models/types';
import { AppError } from '../middleware/errorHandler';

/** POST /api/rfqs/:id/quotes — supplier submits a quote for an RFQ */
export const submitQuote = async (
  req: Request<{ id: string }, object, SubmitQuoteBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: rfq_id } = req.params;
    const { supplier_id, price_per_unit, lead_time_days, notes } = req.body;

    if (!supplier_id || !price_per_unit || !lead_time_days) {
      const err: AppError = new Error('supplier_id, price_per_unit, and lead_time_days are required');
      err.statusCode = 400;
      return next(err);
    }

    // Verify supplier role
    const { rows: userRows } = await pool.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [supplier_id],
    );
    if (!userRows.length || userRows[0].role !== 'supplier') {
      const err: AppError = new Error('Only suppliers can submit quotes');
      err.statusCode = 403;
      return next(err);
    }

    // Verify RFQ exists and is open/pooled
    const { rows: rfqRows } = await pool.query(
      `SELECT id, status FROM rfqs WHERE id = $1`,
      [rfq_id],
    );
    if (!rfqRows.length) {
      const err: AppError = new Error('RFQ not found');
      err.statusCode = 404;
      return next(err);
    }
    if (!['open', 'pooled'].includes(rfqRows[0].status)) {
      const err: AppError = new Error('Cannot quote on a closed RFQ');
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Quote>(
      `INSERT INTO quotes (rfq_id, supplier_id, price_per_unit, lead_time_days, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (rfq_id, supplier_id)
       DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit,
                     lead_time_days = EXCLUDED.lead_time_days,
                     notes          = EXCLUDED.notes,
                     updated_at     = NOW()
       RETURNING *`,
      [rfq_id, supplier_id, price_per_unit, lead_time_days, notes || null],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** GET /api/rfqs/:id/quotes — list all quotes for an RFQ */
export const listQuotesForRfq = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id: rfq_id } = req.params;

    const { rows } = await pool.query<Quote>(
      `SELECT q.*, u.name AS supplier_name
         FROM quotes q
         JOIN users u ON u.id = q.supplier_id
        WHERE q.rfq_id = $1
        ORDER BY q.created_at DESC`,
      [rfq_id],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/suppliers/:supplierId/quotes — list all quotes by a supplier */
export const listQuotesBySupplier = async (
  req: Request<{ supplierId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplierId } = req.params;

    const { rows } = await pool.query<Quote>(
      `SELECT q.*, r.product_name, r.quantity, r.city, r.status AS rfq_status
         FROM quotes q
         JOIN rfqs r ON r.id = q.rfq_id
        WHERE q.supplier_id = $1
        ORDER BY q.created_at DESC`,
      [supplierId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/quotes/:id/status — buyer/admin updates quote status */
export const updateQuoteStatus = async (
  req: Request<{ id: string }, object, { status: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'accepted', 'rejected'];
    if (!allowed.includes(status)) {
      const err: AppError = new Error(`Invalid status. Allowed: ${allowed.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Quote>(
      `UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Quote not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
