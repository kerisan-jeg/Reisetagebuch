import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || !body.to || !body.subject || !(body.text || body.html)) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
  }

  // Try to dynamically import nodemailer
  let nodemailer: any;
  try {
    nodemailer = await import('nodemailer');
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'nodemailer not installed. Run `npm install nodemailer` to enable email sending.' }),
      { status: 501 }
    );
  }

  try {
    // Create a test account (Ethereal) for development if no SMTP config provided
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: body.from || 'no-reply@example.com',
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html
    });

    // Preview URL for Ethereal
    const preview = nodemailer.getTestMessageUrl(info) || null;

    return new Response(JSON.stringify({ ok: true, preview }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
};
