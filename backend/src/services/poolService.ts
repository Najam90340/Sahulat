import pool from '../config/database';
import { Pool as BuyingPool, PoolStatus, MemberStatus } from '../models/types';

/**
 * Recalculate pool current_quantity from members and persist it.
 * Returns the updated pool row.
 */
export const refreshPoolQuantity = async (poolId: string): Promise<BuyingPool> => {
  // Only count 'pending' members – confirmed/refunded contributions are already finalised
  // and should not be double-counted when the pool is later re-evaluated.
  const { rows } = await pool.query<BuyingPool>(
    `UPDATE pools
        SET current_quantity = (
              SELECT COALESCE(SUM(quantity), 0)
              FROM   pool_members
              WHERE  pool_id = $1
                AND  status  = 'pending'
            ),
            updated_at = NOW()
      WHERE id = $1
  RETURNING *`,
    [poolId],
  );
  return rows[0];
};

/**
 * Auto-confirm pool when current_quantity >= moq.
 * Marks all pending members as confirmed.
 */
export const tryAutoConfirm = async (poolId: string): Promise<BuyingPool | null> => {
  const updated = await refreshPoolQuantity(poolId);
  if (!updated || updated.current_quantity < updated.moq) return null;

  // Confirm the pool
  const { rows } = await pool.query<BuyingPool>(
    `UPDATE pools SET status = 'confirmed', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [poolId],
  );

  // Confirm all pending members
  await pool.query(
    `UPDATE pool_members SET status = 'confirmed' WHERE pool_id = $1 AND status = 'pending'`,
    [poolId],
  );

  // Mark linked RFQ as confirmed
  await pool.query(
    `UPDATE rfqs SET status = 'confirmed', updated_at = NOW() WHERE id = $1`,
    [rows[0].rfq_id],
  );

  return rows[0];
};

/**
 * Auto-refund pool when deadline has passed and MOQ is NOT met.
 * Marks all pending members as refunded.
 */
export const processExpiredPool = async (poolId: string): Promise<BuyingPool | null> => {
  const { rows: poolRows } = await pool.query<BuyingPool>(
    `SELECT * FROM pools WHERE id = $1`,
    [poolId],
  );
  const p = poolRows[0];
  if (!p) return null;
  if (p.status !== 'open') return p;

  const now = new Date();
  const deadline = p.deadline ? new Date(p.deadline) : null;
  if (!deadline || now < deadline) return null; // not yet expired

  let newStatus: PoolStatus;
  let newMemberStatus: MemberStatus;

  if (p.current_quantity >= p.moq) {
    // MOQ met – confirm (safety net, should already be confirmed)
    newStatus = 'confirmed';
    newMemberStatus = 'confirmed';
  } else if (p.current_quantity > 0) {
    // Partial fulfillment – mark partial and refund members
    newStatus = 'partial';
    newMemberStatus = 'refunded';
  } else {
    newStatus = 'refunded';
    newMemberStatus = 'refunded';
  }

  const { rows } = await pool.query<BuyingPool>(
    `UPDATE pools SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [newStatus, poolId],
  );

  await pool.query(
    `UPDATE pool_members SET status = $1 WHERE pool_id = $2 AND status = 'pending'`,
    [newMemberStatus, poolId],
  );

  // Update linked RFQ
  const rfqStatus = newStatus === 'confirmed' ? 'confirmed' : 'cancelled';
  await pool.query(
    `UPDATE rfqs SET status = $1, updated_at = NOW() WHERE id = $2`,
    [rfqStatus, rows[0].rfq_id],
  );

  return rows[0];
};

/**
 * Scan all open pools and expire those past their deadline.
 * Called on startup and can be triggered by a cron-like mechanism.
 */
export const expireOpenPools = async (): Promise<void> => {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM pools WHERE status = 'open' AND deadline IS NOT NULL AND deadline < NOW()`,
  );
  for (const row of rows) {
    await processExpiredPool(row.id);
  }
};
