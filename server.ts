import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';

const db = new Database('database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS walkthroughs (
    date TEXT PRIMARY KEY,
    data TEXT
  );
  CREATE TABLE IF NOT EXISTS shift_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    data TEXT
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/walkthrough/:date', (req, res) => {
    try {
      const stmt = db.prepare('SELECT data FROM walkthroughs WHERE date = ?');
      const row = stmt.get(req.params.date) as { data: string } | undefined;
      if (row) {
        res.json(JSON.parse(row.data));
      } else {
        res.json(null);
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/walkthrough/:date', (req, res) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO walkthroughs (date, data)
        VALUES (?, ?)
        ON CONFLICT(date) DO UPDATE SET data = excluded.data
      `);
      stmt.run(req.params.date, JSON.stringify(req.body));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/shift-report', async (req, res) => {
    try {
      const { date, data, emailBody, subject } = req.body;
      
      // Save to DB
      const stmt = db.prepare('INSERT INTO shift_reports (date, data) VALUES (?, ?)');
      stmt.run(date, JSON.stringify(data));

      // Attempt to send email
      const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFICATION_EMAIL } = process.env;
      
      if (SMTP_HOST && SMTP_USER && SMTP_PASS && NOTIFICATION_EMAIL) {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT || '587'),
          secure: parseInt(SMTP_PORT || '587') === 465,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Wendy's App" <${SMTP_USER}>`,
          to: NOTIFICATION_EMAIL,
          subject: subject || `Shift Report - ${date}`,
          text: emailBody,
        });
        
        console.log('Email sent successfully via SMTP');
        res.json({ success: true, message: 'Report saved and email sent.' });
      } else {
        console.log('--- EMAIL NOTIFICATION (SMTP NOT CONFIGURED) ---');
        console.log(`To: ${NOTIFICATION_EMAIL || 'wendys283@divinellc.com'}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${emailBody}`);
        console.log('------------------------------------------------');
        res.json({ success: true, message: 'Report saved. Email logged to console (configure SMTP to send real emails).' });
      }
    } catch (e) {
      console.error('Error in shift report:', e);
      res.status(500).json({ error: 'Failed to process shift report' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
