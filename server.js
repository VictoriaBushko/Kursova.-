const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const PORT = 3000;

const SERIAL_PORT_NAME = 'COM11';
const SERIAL_BAUD_RATE = 115200;
const DEVICE_NAME = 'Door_Security_System';
const DB_FILE = path.join(__dirname, 'door_security_system.db');

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('SQLite error:', err.message);
  else console.log('Connected to SQLite database');
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS current_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_name TEXT UNIQUE,
      current_status TEXT,
      last_updated TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_name TEXT,
      status_value TEXT,
      event_time TEXT
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO current_status 
    (device_name, current_status, last_updated)
    VALUES (?, 'CLOSED', ?)
  `, [DEVICE_NAME, new Date().toISOString()]);
});

function saveStatus(status) {
  const now = new Date().toISOString();

  db.serialize(() => {
    db.run(`
      INSERT INTO current_status (device_name, current_status, last_updated)
      VALUES (?, ?, ?)
      ON CONFLICT(device_name) DO UPDATE SET
        current_status = excluded.current_status,
        last_updated = excluded.last_updated
    `, [DEVICE_NAME, status, now]);

    db.run(`
      INSERT INTO event_log (device_name, status_value, event_time)
      VALUES (?, ?, ?)
    `, [DEVICE_NAME, status, now], (err) => {
      if (err) console.error('DB insert error:', err.message);
      else console.log(`[${now}] Saved: ${status}`);
    });
  });
}

const serialPort = new SerialPort({
  path: SERIAL_PORT_NAME,
  baudRate: SERIAL_BAUD_RATE
});

const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

serialPort.on('open', () => {
  console.log(`COM port opened: ${SERIAL_PORT_NAME}`);
});

serialPort.on('error', (err) => {
  console.error('Serial port error:', err.message);
});

parser.on('data', (line) => {
  const status = line.trim().toUpperCase();

  if (status === 'OPEN' || status === 'CLOSED') {
    console.log('Received from ESP32:', status);
    saveStatus(status);
  } else {
    console.log('Ignored:', status);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  db.get(`
    SELECT device_name, current_status, last_updated
    FROM current_status
    WHERE device_name = ?
  `, [DEVICE_NAME], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!row) return res.json({});

    res.json({
      deviceName: row.device_name,
      currentStatus: row.current_status,
      lastUpdated: row.last_updated
    });
  });
});

app.get('/api/logs', (req, res) => {
  db.all(`
    SELECT id, device_name, status_value, event_time
    FROM event_log
    ORDER BY id DESC
    LIMIT 50
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(rows.map(row => ({
      id: row.id,
      deviceName: row.device_name,
      statusValue: row.status_value,
      eventTime: row.event_time
    })));
  });
});

app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});