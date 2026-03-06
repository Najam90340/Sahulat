import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/errorHandler';

/** GET /api/suppliers/:supplierId/dashboard — supplier dashboard stats */
export const getSupplierDashboard = async (
  req: Request<{ supplierId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplierId } = req.params;

    // Verify this user is a supplier
    const { rows: userRows } = await pool.query(
      `SELECT id, name, email, city, verification_status, role FROM users WHERE id = $1`,
      [supplierId],
    );

    if (!userRows.length || userRows[0].role !== 'supplier') {
      const err: AppError = new Error('Supplier not found');
      err.statusCode = 404;
      return next(err);
    }

    const [quotesStats, catalogStats, openRfqsStats] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)                                         AS total_quotes,
           COUNT(*) FILTER (WHERE status = 'pending')      AS pending_quotes,
           COUNT(*) FILTER (WHERE status = 'accepted')     AS accepted_quotes,
           COUNT(*) FILTER (WHERE status = 'rejected')     AS rejected_quotes
         FROM quotes WHERE supplier_id = $1`,
        [supplierId],
      ),
      pool.query(
        `SELECT COUNT(*) AS catalog_items FROM catalog_items WHERE supplier_id = $1 AND is_active = TRUE`,
        [supplierId],
      ),
      pool.query(
        `SELECT COUNT(*) AS open_rfqs FROM rfqs WHERE status IN ('open', 'pooled')`,
      ),
    ]);

    res.json({
      success: true,
      data: {
        supplier: userRows[0],
        stats: {
          ...quotesStats.rows[0],
          catalog_items: catalogStats.rows[0].catalog_items,
          open_rfqs: openRfqsStats.rows[0].open_rfqs,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/suppliers/:supplierId/orders — supplier's confirmed/active orders */
export const getSupplierOrders = async (
  req: Request<{ supplierId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplierId } = req.params;

    // Orders = confirmed pools linked to RFQs where supplier has an accepted quote
    const { rows } = await pool.query(
      `SELECT
         p.id            AS pool_id,
         p.product_name,
         p.city,
         p.moq,
         p.current_quantity,
         p.status        AS pool_status,
         p.deadline,
         p.created_at,
         r.id            AS rfq_id,
         r.description   AS rfq_description,
         q.price_per_unit,
         q.lead_time_days,
         q.status        AS quote_status,
         (p.current_quantity * q.price_per_unit) AS estimated_revenue
       FROM quotes q
       JOIN rfqs r  ON r.id = q.rfq_id
       JOIN pools p ON p.rfq_id = r.id
       WHERE q.supplier_id = $1
         AND q.status = 'accepted'
       ORDER BY p.created_at DESC`,
      [supplierId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/suppliers/:supplierId/analytics — supplier revenue & order analytics */
export const getSupplierAnalytics = async (
  req: Request<{ supplierId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplierId } = req.params;

    const [orderStats, quoteStats, topProducts] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(p.id)                                           AS total_orders,
           COUNT(p.id) FILTER (WHERE p.status = 'confirmed')    AS confirmed_orders,
           SUM(p.current_quantity * q.price_per_unit)           AS total_revenue,
           SUM(p.current_quantity * q.price_per_unit)
             FILTER (WHERE p.status = 'confirmed')              AS confirmed_revenue
         FROM quotes q
         JOIN rfqs r  ON r.id = q.rfq_id
         JOIN pools p ON p.rfq_id = r.id
         WHERE q.supplier_id = $1 AND q.status = 'accepted'`,
        [supplierId],
      ),
      pool.query(
        `SELECT
           COUNT(*)                                         AS total_quotes,
           COUNT(*) FILTER (WHERE status = 'accepted')     AS won_quotes,
           COUNT(*) FILTER (WHERE status = 'rejected')     AS lost_quotes,
           COUNT(*) FILTER (WHERE status = 'pending')      AS pending_quotes
         FROM quotes WHERE supplier_id = $1`,
        [supplierId],
      ),
      pool.query(
        `SELECT p.product_name, COUNT(*) AS order_count,
                SUM(p.current_quantity * q.price_per_unit) AS revenue
         FROM quotes q
         JOIN rfqs r  ON r.id = q.rfq_id
         JOIN pools p ON p.rfq_id = r.id
         WHERE q.supplier_id = $1 AND q.status = 'accepted'
         GROUP BY p.product_name
         ORDER BY revenue DESC NULLS LAST
         LIMIT 5`,
        [supplierId],
      ),
    ]);

    res.json({
      success: true,
      data: {
        orders: orderStats.rows[0],
        quotes: quoteStats.rows[0],
        top_products: topProducts.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};
