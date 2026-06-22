const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(SUBMISSIONS_FILE)) fs.writeFileSync(SUBMISSIONS_FILE, '[]');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function getSubmissions() {
  try { return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8')); }
  catch { return []; }
}
function saveSubmissions(items) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(items, null, 2));
}

function csvEscape(value) {
  const str = String(value ?? '').replace(/\r?\n/g, ' ');
  return `"${str.replace(/"/g, '""')}"`;
}

async function sendNotification(record) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, BUSINESS_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !BUSINESS_EMAIL) return;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  const subject = `New ${record.formType} submission - ${record.fullName || record.name || 'Applicant'}`;
  const body = Object.entries(record)
    .filter(([k]) => !['signatureData','files'].includes(k))
    .map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n');
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: BUSINESS_EMAIL,
    subject,
    text: body
  });
}

app.post('/api/submit', upload.array('documents', 8), async (req, res) => {
  const submissions = getSubmissions();
  const record = {
    id: `CHHS-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    formType: req.body.formType || 'Application',
    ...req.body,
    files: (req.files || []).map(f => ({ originalName: f.originalname, filename: f.filename, size: f.size }))
  };
  submissions.unshift(record);
  saveSubmissions(submissions);
  try { await sendNotification(record); } catch (e) { console.error('Email notification failed:', e.message); }
  res.json({ ok: true, id: record.id, message: 'Your form was submitted successfully.' });
});

app.get('/api/submissions', (req, res) => {
  const password = req.query.password || req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  res.json(getSubmissions());
});

app.get('/api/submissions.csv', (req, res) => {
  const password = req.query.password || req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).send('Unauthorized');
  const items = getSubmissions();
  const headers = ['id','submittedAt','formType','fullName','phone','email','incomeSource','monthlyIncome','housingNeed','status','caseManagerName','caseManagerEmail','dateSigned','ipAddress'];
  const rows = [headers.join(',')].concat(items.map(item => headers.map(h => csvEscape(item[h])).join(',')));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="chhs-submissions.csv"');
  res.send(rows.join('\n'));
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`CHHS website running on port ${PORT}`));
