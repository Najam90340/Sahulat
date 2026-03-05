import fs from 'fs';
import path from 'path';
import pool from '../config/database';

export const runMigrations = async (): Promise<void> => {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  try {
    await pool.query(schema);
    console.log('Database schema applied successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

export const runSeed = async (): Promise<void> => {
  const seedPath = path.join(__dirname, 'seed.sql');
  const seed = fs.readFileSync(seedPath, 'utf-8');
  try {
    await pool.query(seed);
    console.log('Seed data inserted successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
};
