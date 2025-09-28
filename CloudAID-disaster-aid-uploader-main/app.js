require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AWS = require('aws-sdk');
const uuid = require('uuid').v4;
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { Parser } = require('json2csv');
const os = require('os');

const app = express();
const uploadsFile = path.join(__dirname, 'uploads.json');
const ngosFile = path.join(__dirname, 'ngousers.json');

// Dynamic IP resolver for LAN-based reset links
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret123',
  resave: false,
  saveUninitialized: true
}));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const upload = multer({ dest: 'uploads/' });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
});

// ---------------------- ROUTES ----------------------

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/ngologin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ngologin.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

app.get('/dashboard', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'ngo') {
    return res.redirect('/ngologin');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'admin') {
    return res.redirect('/ngologin');
  }

  const ngos = fs.existsSync(ngosFile) ? JSON.parse(fs.readFileSync(ngosFile)) : [];
  const uploads = fs.existsSync(uploadsFile) ? JSON.parse(fs.readFileSync(uploadsFile)) : [];

  let ngoRows = ngos.map((n, index) =>
    `<tr>
      <td>${n.fullname}</td>
      <td>${n.organization}</td>
      <td>${n.email}</td>
      <td>${n.username}</td>
      <td><button onclick="deleteNGO(${index})">Delete</button></td>
    </tr>`
  ).join('');

  let uploadRows = uploads.map((u, index) =>
    `<tr>
      <td>${u.name}</td>
      <td>${u.location}</td>
      <td>${u.status}</td>
      <td>${u.helpedBy || '—'}</td>
      <td><button onclick="deletePost(${index})">Delete</button></td>
    </tr>`
  ).join('');

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Admin Dashboard</title>
  <style>
    body {
      background: linear-gradient(135deg, #1c1c2b, #3f4c6b);
      color: white;
      font-family: 'Segoe UI', sans-serif;
      padding: 40px;
      margin: 0;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .top-bar a {
      color: #f2c94c;
      text-decoration: none;
      font-weight: bold;
      background: rgba(255,255,255,0.05);
      padding: 10px 20px;
      border-radius: 6px;
      transition: all 0.3s ease;
    }

    .top-bar a:hover {
      background: #f2c94c;
      color: black;
    }

    h1, h2 {
      color: #f2c94c;
      margin-top: 40px;
    }

    input {
      margin: 15px 0;
      padding: 10px;
      width: 320px;
      border-radius: 6px;
      border: none;
      background: rgba(255,255,255,0.1);
      color: white;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: rgba(255,255,255,0.03);
      margin-bottom: 50px;
      border-radius: 10px;
      overflow: hidden;
    }

    th, td {
      padding: 12px 16px;
      border-bottom: 1px solid #444;
      text-align: left;
    }

    th {
      background-color: #292f4c;
      color: #f2c94c;
    }

    tr:hover {
      background-color: rgba(255,255,255,0.05);
    }

    button {
      padding: 8px 16px;
      background: crimson;
      color: white;
      border: none;
      border-radius: 5px;
      font-weight: bold;
      cursor: pointer;
      transition: 0.2s;
    }

    button:hover {
      background: darkred;
    }

    .export-links {
      margin-top: 20px;
    }

    .export-links a {
      margin-right: 20px;
      color: #f2c94c;
      text-decoration: none;
      font-weight: bold;
      background: rgba(255,255,255,0.05);
      padding: 8px 14px;
      border-radius: 6px;
    }

    .export-links a:hover {
      background: #f2c94c;
      color: black;
    }
  </style>
</head>
<body>

  <div class="top-bar">
    <h1>Admin Dashboard</h1>
    <a href="/logout">Logout</a>
  </div>

  <div class="export-links">
    <a href="/admin/export/ngos">📁 Export NGOs</a>
    <a href="/admin/export/uploads">📁 Export Aid Uploads</a>
  </div>

  <h2>Registered NGOs</h2>
  <input type="text" id="ngoFilter" onkeyup="filterTable('ngoTable', 0)" placeholder="Search NGO Name...">
  <table id="ngoTable">
    <thead>
      <tr><th>Name</th><th>Organization</th><th>Email</th><th>Username</th><th>Action</th></tr>
    </thead>
    <tbody>
      ${ngoRows}
    </tbody>
  </table>

  <h2>Aid Posts</h2>
  <input type="text" id="statusFilter" onkeyup="filterTable('aidTable', 2)" placeholder="Filter by status (pending/helped/in-progress)">
  <table id="aidTable">
    <thead>
      <tr><th>Name</th><th>Location</th><th>Status</th><th>Helped By</th><th>Action</th></tr>
    </thead>
    <tbody>
      ${uploadRows}
    </tbody>
  </table>

  <script>
    function filterTable(tableId, colIndex) {
      const input = document.getElementById(tableId === 'ngoTable' ? 'ngoFilter' : 'statusFilter');
      const filter = input.value.toLowerCase();
      const rows = document.getElementById(tableId).getElementsByTagName('tr');

      for (let i = 1; i < rows.length; i++) {
        const td = rows[i].getElementsByTagName('td')[colIndex];
        rows[i].style.display = td && td.textContent.toLowerCase().includes(filter) ? '' : 'none';
      }
    }

    function deleteNGO(index) {
      if (confirm("Are you sure you want to delete this NGO?")) {
        fetch('/admin/delete-ngo/' + index, { method: 'DELETE' }).then(() => location.reload());
      }
    }

    function deletePost(index) {
      if (confirm("Delete this post?")) {
        fetch('/admin/delete-post/' + index, { method: 'DELETE' }).then(() => location.reload());
      }
    }
  </script>
</body>
</html>
`);
});

app.get('/admin/export/ngos', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'admin') return res.status(403).send('Unauthorized');

  const ngos = fs.existsSync(ngosFile) ? JSON.parse(fs.readFileSync(ngosFile)) : [];
  const parser = new Parser({ fields: ['fullname', 'organization', 'email', 'username'] });
  const csv = parser.parse(ngos);

  res.header('Content-Type', 'text/csv');
  res.attachment('ngo_users.csv');
  res.send(csv);
});

app.get('/admin/export/uploads', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'admin') return res.status(403).send('Unauthorized');

  const uploads = fs.existsSync(uploadsFile) ? JSON.parse(fs.readFileSync(uploadsFile)) : [];
  const parser = new Parser({ fields: ['name', 'location', 'description', 'timestamp', 'status', 'helpedBy'] });
  const csv = parser.parse(uploads);

  res.header('Content-Type', 'text/csv');
  res.attachment('aid_uploads.csv');
  res.send(csv);
});

app.get('/ngo-profile', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'ngo') {
    return res.redirect('/ngologin');
  }

  const ngos = fs.existsSync(ngosFile) ? JSON.parse(fs.readFileSync(ngosFile)) : [];
const uploads = fs.existsSync(uploadsFile) ? JSON.parse(fs.readFileSync(uploadsFile)) : [];

const user = ngos.find(u => u.username === req.session.username);
const userPosts = uploads.filter(post => post.helpedBy === user.organization);

const postsHTML = userPosts.map(p => `
  <tr>
    <td>${p.name}</td>
    <td>${p.location}</td>
    <td>${new Date(p.timestamp).toLocaleString()}</td>
    <td>${p.status}</td>
  </tr>
`).join('');

res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>NGO Profile</title>
  <style>
    body {
      background: linear-gradient(135deg, #1c1c2b, #3f4c6b);
      font-family: 'Segoe UI', sans-serif;
      color: white;
      margin: 0;
      padding: 40px;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .top-bar a {
      color: #f2c94c;
      text-decoration: none;
      font-weight: bold;
      background: rgba(255,255,255,0.05);
      padding: 10px 20px;
      border-radius: 6px;
      transition: all 0.3s ease;
    }

    .top-bar a:hover {
      background: #f2c94c;
      color: black;
    }

    h1, h2 {
      color: #f2c94c;
      margin-bottom: 10px;
    }

    .info {
      background: rgba(255,255,255,0.05);
      padding: 20px;
      border-radius: 10px;
      margin: 30px 0;
      line-height: 1.7;
    }

    .info p {
      margin: 8px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
      overflow: hidden;
    }

    th, td {
      padding: 12px 15px;
      border-bottom: 1px solid #444;
    }

    th {
      background-color: #292f4c;
      color: #f2c94c;
      text-align: left;
    }

    tr:hover {
      background-color: rgba(255,255,255,0.05);
    }

    .no-data {
      margin-top: 20px;
      font-style: italic;
      color: #ccc;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <a href="/dashboard">⬅ Back to Dashboard</a>
    <a href="/logout">Logout</a>
  </div>

  <h1>NGO Profile</h1>

  <div class="info">
    <p><strong>Name:</strong> ${user.fullname}</p>
    <p><strong>Organization:</strong> ${user.organization}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Username:</strong> ${user.username}</p>
  </div>

  <h2>Projects Taken Over</h2>
  ${userPosts.length === 0 ? '<p class="no-data">No projects taken yet.</p>' : `
    <table>
      <thead>
        <tr><th>Name</th><th>Location</th><th>Timestamp</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${postsHTML}
      </tbody>
    </table>
  `}
</body>
</html>
`);
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.delete('/admin/delete-ngo/:index', (req, res) => {
  const index = parseInt(req.params.index);
  if (fs.existsSync(ngosFile)) {
    let ngos = JSON.parse(fs.readFileSync(ngosFile));
    ngos.splice(index, 1);
    fs.writeFileSync(ngosFile, JSON.stringify(ngos, null, 2));
  }
  res.sendStatus(200);
});

app.delete('/admin/delete-post/:index', (req, res) => {
  const index = parseInt(req.params.index);
  if (fs.existsSync(uploadsFile)) {
    let uploads = JSON.parse(fs.readFileSync(uploadsFile));
    uploads.splice(index, 1);
    fs.writeFileSync(uploadsFile, JSON.stringify(uploads, null, 2));
  }
  res.sendStatus(200);
});

// ---------------------- AUTH: LOGIN ----------------------

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'adminpass') {
    req.session.loggedIn = true;
    req.session.role = 'admin';
    return res.redirect('/admin-dashboard');
  }

  let ngos = [];
  if (fs.existsSync(ngosFile)) {
    ngos = JSON.parse(fs.readFileSync(ngosFile));
  }

  const ngo = ngos.find(u => u.username === username);
  if (ngo) {
    const match = await bcrypt.compare(password, ngo.password);
    if (match) {
      req.session.loggedIn = true;
      req.session.role = 'ngo';
      req.session.username = username;
      return res.redirect('/dashboard');
    }
  }

  return res.send('<h2>Invalid credentials</h2><a href="/ngologin">Try again</a>');
});

// ---------------------- AUTH: REGISTER ----------------------

app.post('/register', async (req, res) => {
  const { fullname, organization, email, username, password } = req.body;

  let ngos = [];
  if (fs.existsSync(ngosFile)) {
    ngos = JSON.parse(fs.readFileSync(ngosFile));
  }

  const exists = ngos.find(u => u.username === username || u.email === email);
  if (exists) {
    return res.json({ success: false, message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  ngos.push({ fullname, organization, email, username, password: hashedPassword });

  fs.writeFileSync(ngosFile, JSON.stringify(ngos, null, 2));
  return res.json({ success: true, message: 'Registration successful' });
});

// ---------------------- AUTH: FORGOT PASSWORD ----------------------

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!fs.existsSync(ngosFile)) {
    return res.status(400).json({ success: false, message: 'No users found' });
  }

  const ngos = JSON.parse(fs.readFileSync(ngosFile));
  const user = ngos.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Email not found' });
  }

  const resetLink = `${process.env.BASE_URL}/reset-password/${user.username}`;

  try {
    await transporter.sendMail({
      from: `"AidConnect Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset - AidConnect',
      html: `
        <p>Hi ${user.fullname},</p>
        <p>You requested a password reset for your NGO account.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <br><p>If you didn't request this, just ignore this email.</p>
      `
    });

    return res.json({ success: true, message: `Password reset link sent to ${email}` });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, message: 'Failed to send reset link. Try again later.' });
  }
});

// ---------------------- AUTH: RESET PASSWORD ----------------------

app.get('/reset-password/:username', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.post('/reset-password/:username', async (req, res) => {
  const { username } = req.params;
  const { password } = req.body;

  if (!fs.existsSync(ngosFile)) {
    return res.send('No NGO users found');
  }

  let ngos = JSON.parse(fs.readFileSync(ngosFile));
  const index = ngos.findIndex(u => u.username === username);

  if (index === -1) return res.send('Invalid reset link');

  ngos[index].password = await bcrypt.hash(password, 10);
  fs.writeFileSync(ngosFile, JSON.stringify(ngos, null, 2));

  res.status(200).json({ message: "Password reset successful" });
});

// ---------------------- AID UPLOAD ----------------------

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('No file received');

  const fileStream = fs.createReadStream(file.path);
  const uploadParams = {
    Bucket: process.env.S3_BUCKET,
    Key: `${uuid()}/${file.originalname}`,
    Body: fileStream
  };

  s3.upload(uploadParams, (error, data) => {
    fs.unlinkSync(file.path);
    if (error) return res.status(500).send('Error uploading file');

    const newEntry = {
      id: uuid(),
      name: req.body.name,
      location: req.body.location,
      description: req.body.description,
      imageUrl: data.Location,
      timestamp: new Date().toISOString(),
      status: 'pending',
      helpedBy: ''
    };

    let existing = [];
    if (fs.existsSync(uploadsFile)) {
      existing = JSON.parse(fs.readFileSync(uploadsFile));
    }

    existing.push(newEntry);
    fs.writeFileSync(uploadsFile, JSON.stringify(existing, null, 2));

    res.status(200).json({ message: 'File uploaded successfully', url: data.Location });
  });
});

// ---------------------- API ----------------------

app.get('/api/uploads', (req, res) => {
  if (!req.session.loggedIn || req.session.role !== 'ngo') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!fs.existsSync(uploadsFile)) return res.json([]);

  const data = JSON.parse(fs.readFileSync(uploadsFile));
  const currentNgo = req.session.username;

  // Filter logic:
  const filtered = data.filter(u =>
    u.status === 'pending' || u.helpedBy === getNgoNameByUsername(currentNgo)
  );

  const sorted = filtered.sort((a, b) => {
    const order = { pending: 0, 'in-progress': 1, helped: 2 };
    return order[a.status] - order[b.status];
  });

  res.json(sorted);
});

function getNgoNameByUsername(username) {
  const ngos = JSON.parse(fs.readFileSync(ngosFile));
  const ngo = ngos.find(n => n.username === username);
  return ngo ? ngo.organization : null;
}

app.post('/api/uploads/:id/claim', (req, res) => {
  const { ngoName } = req.body;
  const id = req.params.id;

  const data = JSON.parse(fs.readFileSync(uploadsFile));
  const item = data.find(i => i.id === id);
  if (!item) return res.status(404).send('Not found');

  item.status = 'in-progress';
  item.helpedBy = ngoName;

  fs.writeFileSync(uploadsFile, JSON.stringify(data, null, 2));
  res.sendStatus(200);
});

app.post('/api/uploads/:id/helped', (req, res) => {
  const id = req.params.id;

  const data = JSON.parse(fs.readFileSync(uploadsFile));
  const item = data.find(i => i.id === id);
  if (!item) return res.status(404).send('Not found');

  item.status = 'helped';

  fs.writeFileSync(uploadsFile, JSON.stringify(data, null, 2));
  res.sendStatus(200);
});

// ---------------------- START SERVER ----------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});