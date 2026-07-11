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
const DOCUMENTS_DIR = path.join(DATA_DIR, 'documents');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
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

let submissionsCache = [];

try {
  submissionsCache = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
} catch {
  submissionsCache = [];
}

function getSubmissions() {
  return submissionsCache;
}

function saveSubmissions(items) {
  submissionsCache = items;
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
   
   res.json({ok: true, id: record.id,message: 'Your form was submitted successfully.'
});
  
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
  try {
  await sendNotification(record);
} catch (e) {
  console.error('Email notification failed:', e.message);
}
console.log("NEW SUBMISSION SAVED:", record);
console.log("ALL SUBMISSIONS:", getSubmissions());

res.json({
  ok: true,
  id: record.id,
  message: 'Your form was submitted successfully.'
});
});

app.get('/api/submissions', (req, res) => {
  const password = req.query.password || req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  res.json(getSubmissions());
});
app.get('/api/portal/status', (req, res) => {
  const id = (req.query.id || '').trim();
  const phone = (req.query.phone || '').replace(/\D/g, '');

  if (!id || !phone) {
    return res.status(400).json({ error: 'Missing application ID or phone number' });
  }

  const applications = getSubmissions();

  const match = applications.find(app => {
    const appPhone = String(app.phone || '').replace(/\D/g, '');
    return app.id === id && appPhone === phone;
  });

  if (!match) {
    return res.status(404).json({ error: 'Application not found' });
  }

  res.json({
    id: match.id,
    fullName: match.fullName,
    phone: match.phone,
    email: match.email,
    status: match.status || 'Pending Review',
    housingNeed: match.housingNeed,
    submittedAt: match.submittedAt,
    caseManagerName: match.caseManagerName,
    portalMessage: match.portalMessage || 'Your application has been received and is pending review.'
  });
});
app.post('/api/admin/update', express.json(), (req, res) => {
  const password = req.query.password || req.headers['x-admin-password'];

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id, status, portalMessage, staffNote, caseManagerName } = req.body;

  const applications = getSubmissions();
  const appIndex = applications.findIndex(app => app.id === id);

  if (appIndex === -1) {
    return res.status(404).json({ error: 'Application not found' });
  }

  applications[appIndex].status = status || applications[appIndex].status || 'Pending Review';
  applications[appIndex].portalMessage = portalMessage || applications[appIndex].portalMessage || '';
  applications[appIndex].staffNote = staffNote || applications[appIndex].staffNote || '';
  applications[appIndex].caseManagerName = caseManagerName || applications[appIndex].caseManagerName || '';

  applications[appIndex].timeline = applications[appIndex].timeline || [];
  applications[appIndex].timeline.unshift({
    date: new Date().toISOString(),
    status: applications[appIndex].status,
    note: staffNote || 'Application updated'
  });

  saveSubmissions(applications);

  res.json({
    ok: true,
    message: 'Application updated successfully',
    application: applications[appIndex]
  });
app.post('/api/documents/status', express.json(), (req, res) => {
  const { applicationId, documentId, status } = req.body;

  if (!applicationId || !documentId || !status) {
    return res.status(400).json({ error: 'Missing document update information' });
  }

  const applications = getSubmissions();
  const appIndex = applications.findIndex(app => app.id === applicationId);

  if (appIndex === -1) {
    return res.status(404).json({ error: 'Application not found' });
  }

  applications[appIndex].documents = applications[appIndex].documents || [];
  const docIndex = applications[appIndex].documents.findIndex(doc => doc.id === documentId);

  if (docIndex === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  applications[appIndex].documents[docIndex].status = status;
  applications[appIndex].documents[docIndex].reviewedAt = new Date().toISOString();

  applications[appIndex].timeline = applications[appIndex].timeline || [];
  applications[appIndex].timeline.unshift({
    date: new Date().toISOString(),
    status: 'Document ' + status,
    note: applications[appIndex].documents[docIndex].category + ' marked as ' + status
  });

  saveSubmissions(applications);

  res.json({
    ok: true,
    message: 'Document status updated',
    application: applications[appIndex]
  });
});
app.post('/api/documents/upload', upload.array('documents', 10), (req, res) => {
  const { applicationId, category } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  const applications = getSubmissions();
  const appIndex = applications.findIndex(app => app.id === applicationId);

  if (appIndex === -1) {
    return res.status(404).json({ error: 'Application not found' });
  }

  applications[appIndex].documents = applications[appIndex].documents || [];

  const uploadedDocs = (req.files || []).map(file => ({
    id: 'DOC-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
    category: category || 'Other',
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    uploadedAt: new Date().toISOString(),
    status: 'Pending Review'
  }));

  applications[appIndex].documents.push(...uploadedDocs);
  saveSubmissions(applications);

  res.json({
    ok: true,
    message: 'Documents uploaded successfully',
    documents: uploadedDocs
  });
});
app.get('/api/documents/:applicationId', (req, res) => {
  const { applicationId } = req.params;

  const applications = getSubmissions();
  const application = applications.find(app => app.id === applicationId);

  if (!application) {
    return res.status(404).json({
      error: 'Application not found'
    });
  }

  res.json({
    ok: true,
    documents: application.documents || []
  });
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

app.get('/admin', (req, res) => { 
  res.sendFile(path.join(__dirname, 'public', 'admin.html')));
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')));
});
app.listen(PORT, () => console.log(`CHHS website running on port ${PORT}`);