import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import {
  User,
  UpdateVerificationBody,
  VerificationStatus,
  Dispute,
  CreateDisputeBody,
  UpdateDisputeBody,
  DisputeStatus,
  Subscription,
  CreateSubscriptionBody,
  UpdateSubscriptionBody,
  SubscriptionPlan,
  SubscriptionStatus,
  Promotion,
  CreatePromotionBody,
  UpdatePromotionBody,
  PromotionType,
} from '../models/types';
import { AppError } from '../middleware/errorHandler';

// ── Suppliers ─────────────────────────────────────────────────────────────────

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

// ── Analytics (enhanced with GMV, active users, pool success rate) ────────────

/** GET /api/admin/analytics — platform-wide analytics summary */
export const getAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rfqStats, poolStats, supplierStats, quoteStats, financialStats, userStats] =
      await Promise.all([
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
            COUNT(*)                                             AS total_pools,
            COUNT(*) FILTER (WHERE status = 'open')             AS open_pools,
            COUNT(*) FILTER (WHERE status = 'confirmed')        AS confirmed_pools,
            COUNT(*) FILTER (WHERE status = 'refunded')         AS refunded_pools,
            SUM(current_quantity)                               AS total_quantity_pooled,
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE status = 'confirmed')
                    / NULLIF(COUNT(*), 0), 1
            )                                                   AS pool_success_rate
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
        pool.query(`
          SELECT
            COALESCE(SUM(amount) FILTER (WHERE status = 'released'), 0)  AS gmv_released,
            COALESCE(SUM(amount) FILTER (WHERE status = 'held'),    0)   AS escrow_held,
            COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'),0)   AS total_refunded,
            COUNT(*) FILTER (WHERE status = 'held')                      AS txns_held,
            COUNT(*) FILTER (WHERE status = 'released')                  AS txns_released,
            COUNT(*) FILTER (WHERE status = 'refunded')                  AS txns_refunded,
            COUNT(*)                                                      AS total_transactions
          FROM transactions
        `),
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE role = 'buyer')    AS total_buyers,
            COUNT(*) FILTER (WHERE role = 'supplier') AS total_suppliers_all,
            COUNT(*) FILTER (WHERE role = 'admin')    AS total_admins,
            COUNT(*)                                  AS total_users,
            COUNT(*) FILTER (
              WHERE created_at > NOW() - INTERVAL '30 days'
            )                                         AS new_users_30d
          FROM users
        `),
      ]);

    res.json({
      success: true,
      data: {
        rfqs:      rfqStats.rows[0],
        pools:     poolStats.rows[0],
        suppliers: supplierStats.rows[0],
        quotes:    quoteStats.rows[0],
        financial: financialStats.rows[0],
        users:     userStats.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Disputes ──────────────────────────────────────────────────────────────────

/** GET /api/admin/disputes — list disputes with optional status filter */
export const listDisputes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.query as { status?: string };
    const params: string[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`d.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query<Dispute>(
      `SELECT d.*,
              b.name  AS buyer_name,
              s.name  AS supplier_name,
              p.product_name AS pool_product,
              t.amount AS transaction_amount
         FROM disputes d
         JOIN users b   ON b.id = d.buyer_id
         JOIN users s   ON s.id = d.supplier_id
         LEFT JOIN pools p ON p.id = d.pool_id
         LEFT JOIN transactions t ON t.id = d.transaction_id
         ${where}
         ORDER BY d.created_at DESC`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/disputes — raise a new dispute */
export const createDispute = async (
  req: Request<object, object, CreateDisputeBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { transaction_id, buyer_id, supplier_id, pool_id, reason, evidence_urls, raised_by } =
      req.body;

    if (!buyer_id || !supplier_id || !reason || !raised_by) {
      const err: AppError = new Error('buyer_id, supplier_id, reason, raised_by are required');
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Dispute>(
      `INSERT INTO disputes
         (transaction_id, buyer_id, supplier_id, pool_id, reason, evidence_urls, raised_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        transaction_id || null,
        buyer_id, supplier_id,
        pool_id || null,
        reason,
        evidence_urls || [],
        raised_by,
      ],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/disputes/:id — single dispute */
export const getDispute = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<Dispute>(
      `SELECT d.*,
              b.name  AS buyer_name,
              s.name  AS supplier_name,
              p.product_name AS pool_product,
              t.amount AS transaction_amount
         FROM disputes d
         JOIN users b   ON b.id = d.buyer_id
         JOIN users s   ON s.id = d.supplier_id
         LEFT JOIN pools p ON p.id = d.pool_id
         LEFT JOIN transactions t ON t.id = d.transaction_id
        WHERE d.id = $1`,
      [req.params.id],
    );
    if (!rows.length) {
      const err: AppError = new Error('Dispute not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/disputes/:id — update dispute status + resolution */
export const updateDispute = async (
  req: Request<{ id: string }, object, UpdateDisputeBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, resolution, admin_note } = req.body;

    const allowed: DisputeStatus[] = [
      'open', 'investigating', 'resolved_buyer', 'resolved_supplier', 'rejected',
    ];
    if (!allowed.includes(status)) {
      const err: AppError = new Error(`Invalid status. Allowed: ${allowed.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const isResolved = ['resolved_buyer', 'resolved_supplier', 'rejected'].includes(status);

    const { rows } = await pool.query<Dispute>(
      `UPDATE disputes
          SET status      = $1,
              resolution  = COALESCE($2, resolution),
              admin_note  = COALESCE($3, admin_note),
              resolved_at = CASE WHEN $4 THEN NOW() ELSE resolved_at END,
              updated_at  = NOW()
        WHERE id = $5
        RETURNING *`,
      [status, resolution || null, admin_note || null, isResolved, id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Dispute not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ── Escrow Management ─────────────────────────────────────────────────────────

/** GET /api/admin/escrow — escrow overview: held transactions + totals */
export const getEscrowOverview = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [summary, transactions] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'held'),     0) AS total_held,
          COALESCE(SUM(amount) FILTER (WHERE status = 'released'), 0) AS total_released,
          COALESCE(SUM(amount) FILTER (WHERE status = 'refunded'), 0) AS total_refunded,
          COUNT(*) FILTER (WHERE status = 'held')                      AS held_count,
          COUNT(*) FILTER (WHERE status = 'released')                  AS released_count,
          COALESCE(SUM(amount) FILTER (
            WHERE status = 'released' AND released_at > NOW() - INTERVAL '24 hours'
          ), 0)                                                        AS released_today
        FROM transactions
      `),
      pool.query(`
        SELECT t.*,
               u.name AS buyer_name,
               p.product_name AS pool_product
          FROM transactions t
          JOIN users u ON u.id = t.buyer_id
          JOIN pools p ON p.id = t.pool_id
         WHERE t.status IN ('held', 'initiated')
         ORDER BY t.initiated_at DESC
         LIMIT 50
      `),
    ]);

    res.json({
      success: true,
      data: { summary: summary.rows[0], transactions: transactions.rows },
    });
  } catch (error) {
    next(error);
  }
};

// ── Subscriptions ─────────────────────────────────────────────────────────────

/** GET /api/admin/subscriptions — list all subscriptions */
export const listSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, plan } = req.query as { status?: string; plan?: string };
    const params: string[] = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (plan) {
      params.push(plan);
      conditions.push(`s.plan = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query<Subscription>(
      `SELECT s.*, u.name AS supplier_name, u.email AS supplier_email
         FROM subscriptions s
         JOIN users u ON u.id = s.supplier_id
         ${where}
         ORDER BY s.created_at DESC`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/subscriptions — create subscription */
export const createSubscription = async (
  req: Request<object, object, CreateSubscriptionBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplier_id, plan, amount, currency, starts_at, expires_at, notes } = req.body;

    if (!supplier_id || !plan || amount === undefined) {
      const err: AppError = new Error('supplier_id, plan, amount are required');
      err.statusCode = 400;
      return next(err);
    }

    const validPlans: SubscriptionPlan[] = ['basic', 'pro', 'enterprise'];
    if (!validPlans.includes(plan)) {
      const err: AppError = new Error(`Invalid plan. Allowed: ${validPlans.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Subscription>(
      `INSERT INTO subscriptions
         (supplier_id, plan, amount, currency, starts_at, expires_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        supplier_id, plan, amount,
        currency || 'PKR',
        starts_at || new Date().toISOString(),
        expires_at || null,
        notes || null,
      ],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/subscriptions/:id — update subscription */
export const updateSubscription = async (
  req: Request<{ id: string }, object, UpdateSubscriptionBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { plan, status, amount, expires_at, notes } = req.body;

    const validStatuses: SubscriptionStatus[] = ['active', 'expired', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      const err: AppError = new Error(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Subscription>(
      `UPDATE subscriptions
          SET plan         = COALESCE($1, plan),
              status       = COALESCE($2, status),
              amount       = COALESCE($3, amount),
              expires_at   = COALESCE($4, expires_at),
              notes        = COALESCE($5, notes),
              cancelled_at = CASE WHEN $2 = 'cancelled' THEN NOW() ELSE cancelled_at END,
              updated_at   = NOW()
        WHERE id = $6
        RETURNING *`,
      [plan ?? null, status ?? null, amount ?? null, expires_at ?? null, notes ?? null, id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Subscription not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ── Promotions ────────────────────────────────────────────────────────────────

/** GET /api/admin/promotions — list all promotions */
export const listPromotions = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<Promotion>(
      `SELECT * FROM promotions ORDER BY created_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/promotions — create a promotion */
export const createPromotion = async (
  req: Request<object, object, CreatePromotionBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      code, description, type, value,
      min_order, max_discount, max_uses,
      valid_from, valid_to, target_role,
    } = req.body;

    if (!code || !type || value === undefined) {
      const err: AppError = new Error('code, type, value are required');
      err.statusCode = 400;
      return next(err);
    }

    const validTypes: PromotionType[] = ['percentage', 'fixed'];
    if (!validTypes.includes(type)) {
      const err: AppError = new Error(`Invalid type. Allowed: ${validTypes.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<Promotion>(
      `INSERT INTO promotions
         (code, description, type, value, min_order, max_discount,
          max_uses, valid_from, valid_to, target_role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        code.toUpperCase(), description || null, type, value,
        min_order ?? 0, max_discount || null, max_uses || null,
        valid_from || new Date().toISOString(), valid_to || null,
        target_role || null,
      ],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/promotions/:id — update a promotion */
export const updatePromotion = async (
  req: Request<{ id: string }, object, UpdatePromotionBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { description, value, min_order, max_discount, max_uses, valid_to, is_active } =
      req.body;

    const { rows } = await pool.query<Promotion>(
      `UPDATE promotions
          SET description  = COALESCE($1, description),
              value        = COALESCE($2, value),
              min_order    = COALESCE($3, min_order),
              max_discount = COALESCE($4, max_discount),
              max_uses     = COALESCE($5, max_uses),
              valid_to     = COALESCE($6, valid_to),
              is_active    = COALESCE($7, is_active),
              updated_at   = NOW()
        WHERE id = $8
        RETURNING *`,
      [
        description ?? null, value ?? null, min_order ?? null,
        max_discount ?? null, max_uses ?? null, valid_to ?? null,
        is_active ?? null, id,
      ],
    );

    if (!rows.length) {
      const err: AppError = new Error('Promotion not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/promotions/:id — deactivate (soft delete) a promotion */
export const deactivatePromotion = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<Promotion>(
      `UPDATE promotions SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (!rows.length) {
      const err: AppError = new Error('Promotion not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
