import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { User, UpdateVerificationBody, VerificationStatus } from '../models/types';
import { AppError } from '../middleware/errorHandler';

/** GET /api/admin/suppliers — list all suppliers with verification status */
export const listSuppliers = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<User>(
      `SELECT u.*,
              COUNT(DISTINCT q.id)  AS total_quotes,
              COUNT(DISTINCT ci.id) AS catalog_items
         FROM users u
         LEFT JOIN quotes q       ON q.supplier_id = u.id
         LEFT JOIN catalog_items ci ON ci.supplier_id = u.id
        WHERE u.role = 'supplier'
        GROUP BY u.id
        ORDER BY u.created_at DESC`,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/suppliers/:id — get a single supplier */
export const getSupplier = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query<User>(
      `SELECT u.*,
              COUNT(DISTINCT q.id)  AS total_quotes,
              COUNT(DISTINCT ci.id) AS catalog_items
         FROM users u
         LEFT JOIN quotes q       ON q.supplier_id = u.id
         LEFT JOIN catalog_items ci ON ci.supplier_id = u.id
        WHERE u.id = $1 AND u.role = 'supplier'
        GROUP BY u.id`,
      [id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Supplier not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/suppliers/:id/verify — update supplier verification status */
export const updateSupplierVerification = async (
  req: Request<{ id: string }, object, UpdateVerificationBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { verification_status } = req.body;

    const allowed: VerificationStatus[] = ['pending', 'verified', 'premium'];
    if (!allowed.includes(verification_status)) {
      const err: AppError = new Error(`Invalid verification_status. Allowed: ${allowed.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<User>(
      `UPDATE users
          SET verification_status = $1, updated_at = NOW()
        WHERE id = $2 AND role = 'supplier'
        RETURNING *`,
      [verification_status, id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Supplier not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/analytics — platform-wide analytics summary */
export const getAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rfqStats, poolStats, supplierStats, quoteStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                            AS total_rfqs,
          COUNT(*) FILTER (WHERE status = 'open')            AS open_rfqs,
          COUNT(*) FILTER (WHERE status = 'pooled')          AS pooled_rfqs,
          COUNT(*) FILTER (WHERE status = 'confirmed')       AS confirmed_rfqs,
          COUNT(*) FILTER (WHERE status = 'cancelled')       AS cancelled_rfqs
        FROM rfqs
      `),
      pool.query(`
        SELECT
          COUNT(*)                                            AS total_pools,
          COUNT(*) FILTER (WHERE status = 'open')            AS open_pools,
          COUNT(*) FILTER (WHERE status = 'confirmed')       AS confirmed_pools,
          SUM(current_quantity)                              AS total_quantity_pooled
        FROM pools
      `),
      pool.query(`
        SELECT
          COUNT(*)                                                             AS total_suppliers,
          COUNT(*) FILTER (WHERE verification_status = 'pending')             AS pending_verification,
          COUNT(*) FILTER (WHERE verification_status = 'verified')            AS verified_suppliers,
          COUNT(*) FILTER (WHERE verification_status = 'premium')             AS premium_suppliers
        FROM users
        WHERE role = 'supplier'
      `),
      pool.query(`
        SELECT
          COUNT(*)                                            AS total_quotes,
          COUNT(*) FILTER (WHERE status = 'accepted')        AS accepted_quotes,
          COUNT(*) FILTER (WHERE status = 'pending')         AS pending_quotes,
          COUNT(*) FILTER (WHERE status = 'rejected')        AS rejected_quotes
        FROM quotes
      `),
    ]);

    res.json({
      success: true,
      data: {
        rfqs: rfqStats.rows[0],
        pools: poolStats.rows[0],
        suppliers: supplierStats.rows[0],
        quotes: quoteStats.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};
