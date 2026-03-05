import { Router } from 'express';

const router = Router();

// Mount sub-routers here as the application grows
// Example: router.use('/users', usersRouter);

router.get('/', (_req, res) => {
  res.json({ message: 'Sahulat API v1' });
});

export default router;
