import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { CatalogItem, CreateCatalogItemBody } from '../models/types';
import { AppError } from '../middleware/errorHandler';

/** POST /api/catalog — supplier adds a catalog item */
export const createCatalogItem = async (
  req: Request<object, object, CreateCatalogItemBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplier_id, product_name, category, description, unit, moq, price } = req.body;

    if (!supplier_id || !product_name || !moq) {
      const err: AppError = new Error('supplier_id, product_name, and moq are required');
      err.statusCode = 400;
      return next(err);
    }

    // Verify supplier role
    const { rows: userRows } = await pool.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [supplier_id],
    );
    if (!userRows.length || userRows[0].role !== 'supplier') {
      const err: AppError = new Error('Only suppliers can manage catalog items');
      err.statusCode = 403;
      return next(err);
    }

    const { rows } = await pool.query<CatalogItem>(
      `INSERT INTO catalog_items (supplier_id, product_name, category, description, unit, moq, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [supplier_id, product_name, category || null, description || null, unit || 'units', moq, price || null],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** GET /api/catalog — list catalog items (optionally filter by supplier) */
export const listCatalogItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { supplier_id, category } = req.query as Record<string, string>;

    const conditions: string[] = ['c.is_active = TRUE'];
    const values: unknown[] = [];
    let idx = 1;

    if (supplier_id) { conditions.push(`c.supplier_id = $${idx++}`); values.push(supplier_id); }
    if (category)    { conditions.push(`c.category ILIKE $${idx++}`); values.push(`%${category}%`); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const { rows } = await pool.query<CatalogItem>(
      `SELECT c.*, u.name AS supplier_name
         FROM catalog_items c
         JOIN users u ON u.id = c.supplier_id
         ${where}
        ORDER BY c.created_at DESC`,
      values,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/** GET /api/catalog/:id — get a single catalog item */
export const getCatalogItem = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query<CatalogItem>(
      `SELECT c.*, u.name AS supplier_name
         FROM catalog_items c
         JOIN users u ON u.id = c.supplier_id
        WHERE c.id = $1`,
      [id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Catalog item not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/catalog/:id — supplier updates a catalog item */
export const updateCatalogItem = async (
  req: Request<{ id: string }, object, Partial<CreateCatalogItemBody> & { is_active?: boolean }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { product_name, category, description, unit, moq, price, is_active } = req.body;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (product_name !== undefined) { setClauses.push(`product_name = $${idx++}`); values.push(product_name); }
    if (category !== undefined)     { setClauses.push(`category = $${idx++}`);     values.push(category); }
    if (description !== undefined)  { setClauses.push(`description = $${idx++}`);  values.push(description); }
    if (unit !== undefined)         { setClauses.push(`unit = $${idx++}`);          values.push(unit); }
    if (moq !== undefined)          { setClauses.push(`moq = $${idx++}`);           values.push(moq); }
    if (price !== undefined)        { setClauses.push(`price = $${idx++}`);         values.push(price); }
    if (is_active !== undefined)    { setClauses.push(`is_active = $${idx++}`);     values.push(is_active); }

    if (!setClauses.length) {
      const err: AppError = new Error('No fields to update');
      err.statusCode = 400;
      return next(err);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<CatalogItem>(
      `UPDATE catalog_items SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (!rows.length) {
      const err: AppError = new Error('Catalog item not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/catalog/:id — soft-delete (deactivate) a catalog item */
export const deleteCatalogItem = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query<CatalogItem>(
      `UPDATE catalog_items SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    );

    if (!rows.length) {
      const err: AppError = new Error('Catalog item not found');
      err.statusCode = 404;
      return next(err);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};
