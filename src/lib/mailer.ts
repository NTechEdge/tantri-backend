import nodemailer from 'nodemailer';
import { Resend } from 'resend';

function getMailer() {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resend = resendKey ? new Resend(resendKey) : null;

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const transporter = smtpConfigured
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

  return { resend, transporter };
}

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  const { resend, transporter } = getMailer();
  const from = process.env.MAIL_FROM || 'Tantri <onboarding@resend.dev>';

  if (resend) {
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      throw new Error(error.message || 'Failed to send email via Resend');
    }
    return;
  }

  if (transporter) {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return;
  }

  console.log(`\n📧 [DEV MAIL] To: ${opts.to} | Subject: ${opts.subject}\n`);
}

export async function sendOtpEmail(email: string, code: string, lang: 'bn' | 'en' = 'bn') {
  const { resend, transporter } = getMailer();
  if (!resend && !transporter) {
    console.log(`\n🔑 [DEV OTP] ${email} → ${code} (expires in 10 min)\n`);
    return;
  }
  const subject = lang === 'bn' ? `তন্ত্রী লগইন কোড: ${code}` : `Your Tantri login code: ${code}`;
  const html =
    lang === 'bn'
      ? `<p>আপনার ৬ সংখ্যার লগইন কোড: <b style="font-size:22px;letter-spacing:4px">${code}</b></p><p>কোডটি ১০ মিনিট পর্যন্ত কার্যকর থাকবে।</p>`
      : `<p>Your 6-digit login code is: <b style="font-size:22px;letter-spacing:4px">${code}</b></p><p>It expires in 10 minutes.</p>`;
  await sendMail({ to: email, subject, html });
}
