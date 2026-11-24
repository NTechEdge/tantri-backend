import crypto from 'crypto';
import { Router } from 'express';
import {
  COOKIE_NAME,
  hashOtp,
  isAdminEmail,
  requireUser,
  signAuthToken,
  type AuthRequest,
} from '../lib/auth';
import { sendOtpEmail } from '../lib/mailer';
import { Otp, User } from '../models';

export const authRouter = Router();

authRouter.post('/auth/request-otp', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const last = await Otp.findOne({ email }).sort({ createdAt: -1 }).lean();
    if (last?.createdAt && Date.now() - new Date(last.createdAt).getTime() < 45_000) {
      return res
        .status(429)
        .json({ error: 'Please wait 45 seconds before requesting another code' });
    }

    const hourly = await Otp.countDocuments({
      email,
      createdAt: { $gt: new Date(Date.now() - 3_600_000) },
    });
    if (hourly >= 6) {
      return res.status(429).json({ error: 'Too many codes requested. Try again later.' });
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await Otp.create({
      email,
      codeHash: hashOtp(email, code),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });

    await sendOtpEmail(email, code, req.body.lang === 'en' ? 'en' : 'bn');
    res.json({ ok: true, message: `Code sent to ${email}` });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/verify-otp', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();

    const otp = await Otp.findOne({ email, used: false }).sort({ createdAt: -1 });
    if (!otp || otp.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }
    if (otp.attempts >= 5) {
      return res.status(429).json({ error: 'Too many wrong attempts. Request a new code.' });
    }
    if (otp.codeHash !== hashOtp(email, code)) {
      otp.attempts += 1;
      await otp.save();
      return res.status(400).json({ error: 'Incorrect code' });
    }

    otp.used = true;
    await otp.save();

    const role = isAdminEmail(email) ? 'admin' : 'customer';
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, role });
    } else if (user.role !== role) {
      user.role = role;
      await user.save();
    }

    const isHttps = (process.env.FRONTEND_URL || '').startsWith('https');
    res.cookie(COOKIE_NAME, signAuthToken(String(user._id)), {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 14 * 86400 * 1000,
      path: '/',
    });

    res.json({
      ok: true,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name || '',
        phone: user.phone || '',
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

authRouter.get('/me', (req: AuthRequest, res) => {
  res.json({ user: req.user || null });
});

authRouter.put('/me', requireUser, async (req: AuthRequest, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user!.id, {
      name: String(req.body.name || '').slice(0, 80),
      phone: String(req.body.phone || '').slice(0, 20),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
