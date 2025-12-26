const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database(path.resolve(__dirname, 'database.db'));

const { users, purchases, inventory, audit } = require('./data');

db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        u TEXT UNIQUE,
        p TEXT,
        role TEXT
    )`);

    // Create purchases table
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT,
        qty INTEGER,
        supplier TEXT,
        status TEXT
    )`);

    // Create deliveries table
    db.run(`CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer TEXT,
        item TEXT,
        driver TEXT,
        status TEXT
    )`);

    // Create inventory table
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item TEXT UNIQUE,
        qty INTEGER
    )`);

    // Create audit table
    db.run(`CREATE TABLE IF NOT EXISTS audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log TEXT
    )`);

    // Insert initial data
    const insertUser = db.prepare(`INSERT OR IGNORE INTO users (u, p, role) VALUES (?, ?, ?)`);
    users.forEach(user => {
        const hash = bcrypt.hashSync(user.p, 10);
        insertUser.run(user.u, hash, user.role);
    });
    insertUser.finalize();

    const insertPurchase = db.prepare(`INSERT OR IGNORE INTO purchases (item, qty, supplier, status) VALUES (?, ?, ?, ?)`);
    purchases.forEach(purchase => insertPurchase.run(purchase.item, purchase.qty, purchase.supplier, purchase.status));
    insertPurchase.finalize();

    const insertInventory = db.prepare(`INSERT OR IGNORE INTO inventory (item, qty) VALUES (?, ?)`);
    for (const item in inventory) {
        insertInventory.run(item, inventory[item]);
    }
    insertInventory.finalize();

    const insertAudit = db.prepare(`INSERT OR IGNORE INTO audit (log) VALUES (?)`);
    audit.forEach(log => insertAudit.run(log));
    insertAudit.finalize();
});

module.exports = db;

// Ensure existing plaintext passwords are hashed (simple migration)
const bcrypt2 = require('bcryptjs');
db.serialize(() => {
    db.all('SELECT id, p FROM users', (err, rows) => {
        if (err || !rows) return;
        rows.forEach(r => {
            if (r.p && !/^\$2[aby]\$/.test(r.p)) {
                const h = bcrypt2.hashSync(r.p, 10);
                db.run('UPDATE users SET p = ? WHERE id = ?', [h, r.id]);
            }
        });
    });
});