const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the in-memory SQLite database.');
    initDatabase();
  }
});

function initDatabase() {
  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    department TEXT NOT NULL,
    resourceType TEXT NOT NULL,
    resourceName TEXT NOT NULL,
    permissions TEXT NOT NULL,
    status TEXT DEFAULT 'в обработке',
    createdDate TEXT NOT NULL,
    securityApprovedDate TEXT,
    itManagerApprovedDate TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emailId REAL NOT NULL UNIQUE,
    recipient TEXT NOT NULL,
    toEmail TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    pending INTEGER DEFAULT 1,
    approved INTEGER,
    completed INTEGER DEFAULT 0,
    requestId INTEGER,
    createdDate TEXT NOT NULL,
    FOREIGN KEY(requestId) REFERENCES requests(id)
  )`);
}

function getCurrentDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

function resourceTypeLabel(type) {
  return type === 'network_folder' ? 'Сетевая папка' : 'Сетевой ресурс';
}

// GET all requests
app.get('/api/requests', (req, res) => {
  db.all('SELECT * FROM requests ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST create request
app.post('/api/requests', (req, res) => {
  const { fullName, department, resourceType, resourceName, permissions } = req.body;
  if (!fullName || !department || !resourceType || !resourceName || !permissions) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  const createdDate = getCurrentDate();
  db.run(
    `INSERT INTO requests (fullName, department, resourceType, resourceName, permissions, status, createdDate)
     VALUES (?, ?, ?, ?, ?, 'в обработке', ?)`,
    [fullName, department, resourceType, resourceName, permissions, createdDate],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const requestId = this.lastID;

      const subject = `Новая заявка на доступ: ${fullName}`;
      const body = `Заявка № ${requestId}\nФИО: ${fullName}\nПодразделение: ${department}\nТип ресурса: ${resourceTypeLabel(resourceType)}\nРесурс/папка: ${resourceName}\nТребуемые права: ${permissions}\nДата подачи: ${createdDate}`;
      const emailId = Date.now() + Math.random();

      db.run(
        `INSERT INTO emails (emailId, recipient, toEmail, subject, body, pending, requestId, createdDate)
         VALUES (?, 'Офицер по ИБ', 'security@company.ru', ?, ?, 1, ?, ?)`,
        [emailId, subject, body, requestId, createdDate],
        function (emailErr) {
          if (emailErr) return res.status(500).json({ error: emailErr.message });

          db.get('SELECT * FROM requests WHERE id = ?', [requestId], (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.status(201).json(row);
          });
        }
      );
    }
  );
});

// GET all emails
app.get('/api/emails', (req, res) => {
  db.all('SELECT * FROM emails ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST approve or reject
app.post('/api/emails/:id/action', (req, res) => {
  const emailId = req.params.id;
  const { approve } = req.body;

  db.get('SELECT * FROM emails WHERE id = ?', [emailId], (err, email) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!email) return res.status(404).json({ error: 'Письмо не найдено' });

    const approvalDate = getCurrentDate();

    if (approve) {
      db.run(
        `UPDATE requests SET status = 'согласовано', securityApprovedDate = ? WHERE id = ?`,
        [approvalDate, email.requestId],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });

          db.run(
            `UPDATE emails SET pending = 0, approved = 1 WHERE id = ?`,
            [emailId],
            (err3) => {
              if (err3) return res.status(500).json({ error: err3.message });

              db.get('SELECT * FROM requests WHERE id = ?', [email.requestId], (err4, request) => {
                if (err4) return res.status(500).json({ error: err4.message });

                const newSubject = `Согласована заявка на доступ: ${request.fullName}`;
                const newBody = `Заявка № ${request.id}\nФИО: ${request.fullName}\nПодразделение: ${request.department}\nТип ресурса: ${resourceTypeLabel(request.resourceType)}\nРесурс/папка: ${request.resourceName}\nТребуемые права: ${request.permissions}\nДата подачи: ${request.createdDate}\nДата согласования: ${approvalDate}`;
                const newEmailId = Date.now() + Math.random();

                db.run(
                  `INSERT INTO emails (emailId, recipient, toEmail, subject, body, pending, requestId, createdDate)
                   VALUES (?, 'Менеджер ИТ', 'itmanager@company.ru', ?, ?, 1, ?, ?)`,
                  [newEmailId, newSubject, newBody, email.requestId, approvalDate],
                  (err5) => {
                    if (err5) return res.status(500).json({ error: err5.message });
                    res.json({ success: true, message: 'Request approved' });
                  }
                );
              });
            }
          );
        }
      );
    } else {
      db.run(
        `UPDATE requests SET status = 'отказано' WHERE id = ?`,
        [email.requestId],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          db.run(`UPDATE emails SET pending = 0, approved = 0 WHERE id = ?`, [emailId], (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ success: true, message: 'Request rejected' });
          });
        }
      );
    }
  });
});

// POST complete
app.post('/api/emails/:id/complete', (req, res) => {
  const emailId = req.params.id;

  db.get('SELECT * FROM emails WHERE id = ?', [emailId], (err, email) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!email) return res.status(404).json({ error: 'Письмо не найдено' });

    const completionDate = getCurrentDate();

    db.run(
      `UPDATE requests SET itManagerApprovedDate = ? WHERE id = ?`,
      [completionDate, email.requestId],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        db.run(
          `UPDATE emails SET pending = 0, completed = 1 WHERE id = ?`,
          [emailId],
          (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json({ success: true, message: 'Request completed' });
          }
        );
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Open your browser and navigate to http://localhost:${PORT}`);
});
