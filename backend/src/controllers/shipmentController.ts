import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import {
  Shipment,
  ShipmentEvent,
  DeliveryProof,
  ShipmentMember,
  CreateShipmentBody,
  AddShipmentEventBody,
  SubmitDeliveryProofBody,
  UpdateShipmentStatusBody,
  ShipmentStatus,
} from '../models/types';
import { AppError } from '../middleware/errorHandler';

const VALID_STATUSES: ShipmentStatus[] = [
  'pending', 'booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed',
];

// ── Create Shipment ──────────────────────────────────────────────────────────

/**
 * POST /api/shipments
 *
 * Supplier books a consolidated shipment for a confirmed pool.
 * Optionally includes member delivery details for split shipments.
 */
export const createShipment = async (
  req: Request<object, object, CreateShipmentBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      pool_id, supplier_id, courier, tracking_number,
      origin_city, destination_city, pickup_address, notes,
      estimated_delivery, members,
    } = req.body;

    if (!pool_id || !supplier_id || !courier || !origin_city || !destination_city) {
      const err: AppError = new Error('pool_id, supplier_id, courier, origin_city, and destination_city are required');
      err.statusCode = 400;
      return next(err);
    }

    // Verify pool exists and is confirmed
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
      const err: AppError = new Error('Shipments can only be created for confirmed pools');
      err.statusCode = 400;
      return next(err);
    }

    // Insert shipment
    const { rows } = await pool.query<Shipment>(
      `INSERT INTO shipments
         (pool_id, supplier_id, courier, tracking_number, status, origin_city,
          destination_city, pickup_address, notes, estimated_delivery, booked_at)
       VALUES ($1,$2,$3,$4,
         CASE WHEN $4 IS NOT NULL THEN 'booked' ELSE 'pending' END,
         $5,$6,$7,$8,$9,
         CASE WHEN $4 IS NOT NULL THEN NOW() ELSE NULL END)
       RETURNING *`,
      [pool_id, supplier_id, courier, tracking_number || null,
        origin_city, destination_city, pickup_address || null, notes || null,
        estimated_delivery || null],
    );
    const shipment = rows[0];

    // Auto-add initial tracking event
    const initialStatus = shipment.status as ShipmentStatus;
    const initialDesc = initialStatus === 'booked'
      ? `Shipment booked with ${courier.toUpperCase()}. Tracking number: ${tracking_number}`
      : `Shipment created. Awaiting courier booking.`;
    await pool.query(
      `INSERT INTO shipment_events (shipment_id, status, location, description)
       VALUES ($1,$2,$3,$4)`,
      [shipment.id, initialStatus, origin_city, initialDesc],
    );

    // Insert shipment members if provided
    if (members && members.length > 0) {
      for (const m of members) {
        await pool.query(
          `INSERT INTO shipment_members (shipment_id, pool_member_id, buyer_id, quantity, delivery_address)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (shipment_id, pool_member_id) DO NOTHING`,
          [shipment.id, m.pool_member_id, m.buyer_id, m.quantity, m.delivery_address || null],
        );
      }
    } else {
      // Auto-populate from pool_members
      await pool.query(
        `INSERT INTO shipment_members (shipment_id, pool_member_id, buyer_id, quantity)
         SELECT $1, pm.id, pm.buyer_id, pm.quantity
           FROM pool_members pm
          WHERE pm.pool_id = $2
         ON CONFLICT (shipment_id, pool_member_id) DO NOTHING`,
        [shipment.id, pool_id],
      );
    }

    res.status(201).json({ success: true, data: shipment });
  } catch (error) {
    next(error);
  }
};

// ── Get Shipment (with events + members) ────────────────────────────────────

/** GET /api/shipments/:id */
export const getShipment = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query<Shipment>(
      `SELECT s.*,
              p.product_name,
              u.name AS supplier_name,
              COUNT(DISTINCT sm.id)::int AS member_count,
              COUNT(DISTINCT se.id)::int AS event_count
         FROM shipments s
         JOIN pools p ON p.id = s.pool_id
         JOIN users u ON u.id = s.supplier_id
         LEFT JOIN shipment_members sm ON sm.shipment_id = s.id
         LEFT JOIN shipment_events se ON se.shipment_id = s.id
        WHERE s.id = $1
        GROUP BY s.id, p.product_name, u.name`,
      [id],
    );
    if (!rows.length) {
      const err: AppError = new Error('Shipment not found');
      err.statusCode = 404;
      return next(err);
    }

    // Fetch events (timeline)
    const { rows: events } = await pool.query<ShipmentEvent>(
      `SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY occurred_at ASC`,
      [id],
    );

    // Fetch members
    const { rows: members } = await pool.query<ShipmentMember>(
      `SELECT sm.*, u.name AS buyer_name
         FROM shipment_members sm
         JOIN users u ON u.id = sm.buyer_id
        WHERE sm.shipment_id = $1
        ORDER BY sm.quantity DESC`,
      [id],
    );

    // Fetch proof if exists
    const { rows: proofs } = await pool.query<DeliveryProof>(
      `SELECT * FROM delivery_proofs WHERE shipment_id = $1`,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        events,
        members,
        proof: proofs[0] ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── List Shipments ───────────────────────────────────────────────────────────

/** GET /api/shipments — list all shipments with optional filters */
export const listShipments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, courier, city } = req.query as Record<string, string>;

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status)  { conditions.push(`s.status = $${idx++}`);               values.push(status); }
    if (courier) { conditions.push(`s.courier = $${idx++}`);              values.push(courier); }
    if (city)    { conditions.push(`(s.origin_city ILIKE $${idx} OR s.destination_city ILIKE $${idx++})`); values.push(`%${city}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query<Shipment>(
      `SELECT s.*,
              p.product_name,
              u.name AS supplier_name,
              COUNT(DISTINCT sm.id)::int AS member_count
         FROM shipments s
         JOIN pools p ON p.id = s.pool_id
         JOIN users u ON u.id = s.supplier_id
         LEFT JOIN shipment_members sm ON sm.shipment_id = s.id
         ${where}
         GROUP BY s.id, p.product_name, u.name
         ORDER BY s.created_at DESC`,
      values,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/shipments/pool/:poolId */
export const listPoolShipments = async (
  req: Request<{ poolId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<Shipment>(
      `SELECT s.*, p.product_name, u.name AS supplier_name,
              COUNT(DISTINCT sm.id)::int AS member_count
         FROM shipments s
         JOIN pools p ON p.id = s.pool_id
         JOIN users u ON u.id = s.supplier_id
         LEFT JOIN shipment_members sm ON sm.shipment_id = s.id
        WHERE s.pool_id = $1
        GROUP BY s.id, p.product_name, u.name
        ORDER BY s.created_at DESC`,
      [req.params.poolId],
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/shipments/buyer/:buyerId — all shipments for a buyer's pools */
export const listBuyerShipments = async (
  req: Request<{ buyerId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*,
              p.product_name,
              u.name AS supplier_name,
              sm.quantity AS my_quantity,
              sm.sub_status AS my_sub_status,
              sm.delivery_address,
              sm.delivered_at AS my_delivered_at
         FROM shipment_members sm
         JOIN shipments s ON s.id = sm.shipment_id
         JOIN pools p ON p.id = s.pool_id
         JOIN users u ON u.id = s.supplier_id
        WHERE sm.buyer_id = $1
        ORDER BY s.created_at DESC`,
      [req.params.buyerId],
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/shipments/supplier/:supplierId */
export const listSupplierShipments = async (
  req: Request<{ supplierId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<Shipment>(
      `SELECT s.*, p.product_name,
              COUNT(DISTINCT sm.id)::int AS member_count
         FROM shipments s
         JOIN pools p ON p.id = s.pool_id
         LEFT JOIN shipment_members sm ON sm.shipment_id = s.id
        WHERE s.supplier_id = $1
        GROUP BY s.id, p.product_name
        ORDER BY s.created_at DESC`,
      [req.params.supplierId],
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// ── Update Status ────────────────────────────────────────────────────────────

/**
 * PATCH /api/shipments/:id/status
 *
 * Supplier or courier webhook updates shipment status.
 * Automatically appends a tracking event.
 */
export const updateShipmentStatus = async (
  req: Request<{ id: string }, object, UpdateShipmentStatusBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, tracking_number, notes } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      const err: AppError = new Error(`Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    const { rows: existing } = await pool.query<Shipment>(
      `SELECT * FROM shipments WHERE id = $1`,
      [id],
    );
    if (!existing.length) {
      const err: AppError = new Error('Shipment not found');
      err.statusCode = 404;
      return next(err);
    }

    // Build timestamp columns based on new status using parameterized query
    const setClauses = ['status = $1', 'updated_at = NOW()'];

    if (status === 'booked' && !existing[0].booked_at)      setClauses.push('booked_at = NOW()');
    if (status === 'picked_up' && !existing[0].picked_up_at) setClauses.push('picked_up_at = NOW()');
    if (status === 'delivered' && !existing[0].delivered_at)  setClauses.push('delivered_at = NOW()');

    // Rebuild params: [$1=status, ...optional fields..., $last=id]
    const finalParams: unknown[] = [status];
    if (tracking_number) {
      setClauses.push(`tracking_number = $${finalParams.length + 1}`);
      finalParams.push(tracking_number);
    }
    if (notes) {
      setClauses.push(`notes = $${finalParams.length + 1}`);
      finalParams.push(notes);
    }
    finalParams.push(id);
    const idPlaceholder = `$${finalParams.length}`;

    const setClauseStr = setClauses.join(', ');
    const { rows } = await pool.query<Shipment>(
      `UPDATE shipments SET ${setClauseStr} WHERE id = ${idPlaceholder} RETURNING *`,
      finalParams,
    );

    // Append tracking event
    const descriptions: Record<ShipmentStatus, string> = {
      pending:          'Shipment pending courier booking.',
      booked:           `Shipment booked${tracking_number ? ` (${tracking_number})` : ''}. Awaiting pickup.`,
      picked_up:        'Parcel picked up by courier.',
      in_transit:       'Parcel in transit to destination.',
      out_for_delivery: 'Out for delivery.',
      delivered:        'Delivered successfully.',
      failed:           'Delivery attempt failed.',
    };
    await pool.query(
      `INSERT INTO shipment_events (shipment_id, status, location, description)
       VALUES ($1,$2,$3,$4)`,
      [id, status, existing[0].destination_city, descriptions[status as ShipmentStatus]],
    );

    // If delivered, update all shipment_members sub_status
    if (status === 'delivered') {
      await pool.query(
        `UPDATE shipment_members SET sub_status = 'delivered', delivered_at = NOW()
          WHERE shipment_id = $1 AND sub_status != 'delivered'`,
        [id],
      );
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// ── Tracking Events ──────────────────────────────────────────────────────────

/** POST /api/shipments/:id/events — add a tracking event (supplier/courier webhook) */
export const addShipmentEvent = async (
  req: Request<{ id: string }, object, AddShipmentEventBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, location, description, occurred_at } = req.body;

    if (!status || !description) {
      const err: AppError = new Error('status and description are required');
      err.statusCode = 400;
      return next(err);
    }

    if (!VALID_STATUSES.includes(status as ShipmentStatus)) {
      const err: AppError = new Error(`Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`);
      err.statusCode = 400;
      return next(err);
    }

    // Verify shipment exists and check status transition
    const { rows: existing } = await pool.query<Shipment>(
      `SELECT id, status FROM shipments WHERE id = $1`,
      [id],
    );
    if (!existing.length) {
      const err: AppError = new Error('Shipment not found');
      err.statusCode = 404;
      return next(err);
    }

    // Prevent backwards transitions (webhook events should only advance the status)
    const currentIdx = VALID_STATUSES.indexOf(existing[0].status as ShipmentStatus);
    const newIdx = VALID_STATUSES.indexOf(status as ShipmentStatus);
    if (existing[0].status === 'delivered' || existing[0].status === 'failed') {
      const err: AppError = new Error(
        `Cannot add tracking event: shipment is already in terminal state '${existing[0].status}'`,
      );
      err.statusCode = 400;
      return next(err);
    }
    if (newIdx < currentIdx) {
      const err: AppError = new Error(
        `Invalid status transition: '${existing[0].status}' → '${status}'. Status cannot move backwards.`,
      );
      err.statusCode = 400;
      return next(err);
    }

    const { rows } = await pool.query<ShipmentEvent>(
      `INSERT INTO shipment_events (shipment_id, status, location, description, occurred_at)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [id, status, location || null, description, occurred_at || new Date().toISOString()],
    );

    // Also update shipment status to latest event status
    await pool.query(
      `UPDATE shipments SET status = $1, updated_at = NOW() WHERE id = $2 AND status != 'delivered'`,
      [status, id],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** GET /api/shipments/:id/events — get tracking timeline */
export const getShipmentEvents = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<ShipmentEvent>(
      `SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY occurred_at ASC`,
      [req.params.id],
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// ── SSE Real-time Tracking ────────────────────────────────────────────────────

/** GET /api/shipments/:id/stream — SSE real-time status stream */
export const streamShipmentStatus = async (
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

    const sendStatus = async (): Promise<void> => {
      const { rows } = await pool.query(
        `SELECT s.status, s.tracking_number, s.updated_at,
                se.location, se.description AS last_event
           FROM shipments s
           LEFT JOIN LATERAL (
             SELECT location, description FROM shipment_events
              WHERE shipment_id = s.id ORDER BY occurred_at DESC LIMIT 1
           ) se ON TRUE
          WHERE s.id = $1`,
        [id],
      );
      if (rows.length) {
        res.write(`data: ${JSON.stringify(rows[0])}\n\n`);
      }
    };

    await sendStatus();
    const intervalId = setInterval(sendStatus, 5000);

    req.on('close', () => {
      clearInterval(intervalId);
      res.end();
    });
  } catch (error) {
    next(error);
  }
};

// ── Delivery Proof ────────────────────────────────────────────────────────────

/** POST /api/shipments/:id/proof — submit proof of delivery */
export const submitDeliveryProof = async (
  req: Request<{ id: string }, object, SubmitDeliveryProofBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { photo_url, notes, received_by } = req.body;

    // Verify shipment exists
    const { rows: existing } = await pool.query<Shipment>(
      `SELECT * FROM shipments WHERE id = $1`,
      [id],
    );
    if (!existing.length) {
      const err: AppError = new Error('Shipment not found');
      err.statusCode = 404;
      return next(err);
    }

    const { rows } = await pool.query<DeliveryProof>(
      `INSERT INTO delivery_proofs (shipment_id, photo_url, notes, received_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (shipment_id) DO UPDATE
         SET photo_url  = EXCLUDED.photo_url,
             notes      = EXCLUDED.notes,
             received_by = EXCLUDED.received_by,
             confirmed_at = NOW()
       RETURNING *`,
      [id, photo_url || null, notes || null, received_by || null],
    );

    // Auto-mark shipment as delivered
    await pool.query(
      `UPDATE shipments SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status != 'delivered'`,
      [id],
    );

    // Add delivery event
    await pool.query(
      `INSERT INTO shipment_events (shipment_id, status, description)
       VALUES ($1, 'delivered', $2)`,
      [id, `Proof of delivery submitted. Received by: ${received_by || 'unknown'}.`],
    );

    // Update members
    await pool.query(
      `UPDATE shipment_members SET sub_status = 'delivered', delivered_at = NOW()
        WHERE shipment_id = $1 AND sub_status != 'delivered'`,
      [id],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** GET /api/shipments/:id/proof */
export const getDeliveryProof = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rows } = await pool.query<DeliveryProof>(
      `SELECT * FROM delivery_proofs WHERE shipment_id = $1`,
      [req.params.id],
    );
    if (!rows.length) {
      const err: AppError = new Error('No delivery proof found for this shipment');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
