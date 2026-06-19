import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/config/angles
router.get('/config/angles', async (_req: Request, res: Response) => {
  const result = await db.query(
    'SELECT id, name, description, example_line FROM angles ORDER BY sort_order, id',
  );
  return res.json(result.rows);
});

// GET /api/config/hooks
router.get('/config/hooks', async (_req: Request, res: Response) => {
  const result = await db.query(
    'SELECT id, name, template, description FROM hooks ORDER BY sort_order, id',
  );
  return res.json(result.rows);
});

// GET /api/config/personas
router.get('/config/personas', async (_req: Request, res: Response) => {
  const result = await db.query(
    'SELECT id, name, description FROM personas ORDER BY sort_order, id',
  );
  return res.json(result.rows);
});

export default router;
