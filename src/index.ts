import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { attachUser } from './lib/auth';
import { connectDB } from './lib/db';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { catalogRouter } from './routes/catalog';
import { ordersRouter } from './routes/orders';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(
  cors({
    origin: FRONTEND_URL.split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(attachUser);

app.use('/api', authRouter);
app.use('/api', catalogRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/admin', adminRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Something went wrong' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Tantri Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect MongoDB:', err);
    process.exit(1);
  });
