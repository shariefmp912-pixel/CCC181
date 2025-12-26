const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dbAsync = require('./dbAsync');
const db = require('./database');
const validators = require('./validators');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// async wrapper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Get all data (refactored to async/await)
app.get('/api/data', asyncHandler(async(req, res) => {
    const data = {};
    const users = await dbAsync.all('SELECT id, u, role FROM users');
    data.users = users.map(u => ({ u: u.u, role: u.role }));
    data.purchases = await dbAsync.all('SELECT * FROM purchases');
    data.deliveries = await dbAsync.all('SELECT * FROM deliveries');
    const invRows = await dbAsync.all('SELECT * FROM inventory');
    data.inventory = invRows.reduce((acc, row) => { acc[row.item] = row.qty; return acc; }, {});
    const auditRows = await dbAsync.all('SELECT * FROM audit');
    data.audit = auditRows.map(r => r.log);
    res.json(data);
}));

// Login
app.post('/api/login', validators.validate(validators.loginSchema), asyncHandler(async(req, res) => {
    const { u, p } = req.validated;
    const row = await dbAsync.get('SELECT * FROM users WHERE u = ?', [u]);
    if (!row) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const ok = bcrypt.compareSync(p, row.p);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    // hide password
    delete row.p;
    res.json({ success: true, user: row });
}));

// Add a purchase
app.post('/api/purchases', validators.validate(validators.purchaseSchema), asyncHandler(async(req, res) => {
    const { item, qty, supplier } = req.validated;
    const result = await dbAsync.run('INSERT INTO purchases (item, qty, supplier, status) VALUES (?, ?, ?, ?)', [item, qty, supplier, 'Pending']);
    await dbAsync.run('INSERT INTO audit (log) VALUES (?)', [`${new Date().toLocaleString()} - Purchase created: ${item} x${qty}`]);
    res.json({ id: result.lastID, item, qty, supplier, status: 'Pending' });
}));

// Update a purchase
app.put('/api/purchases/:id', validators.validate(validators.updatePurchaseSchema), asyncHandler(async(req, res) => {
    const { id } = req.params;
    const { status } = req.validated;
    await dbAsync.run('UPDATE purchases SET status = ? WHERE id = ?', [status, id]);
    if (status === 'Approved') {
        const purchase = await dbAsync.get('SELECT * FROM purchases WHERE id = ?', [id]);
        await dbAsync.run('UPDATE inventory SET qty = qty + ? WHERE item = ?', [purchase.qty, purchase.item]);
        await dbAsync.run('INSERT INTO audit (log) VALUES (?)', [`${new Date().toLocaleString()} - Purchase approved: ${purchase.item} +${purchase.qty}`]);
        res.json({...purchase, status });
    } else {
        res.json({ id, status });
    }
}));

// Add a delivery
app.post('/api/deliveries', validators.validate(validators.deliverySchema), asyncHandler(async(req, res) => {
    const { customer, item, driver } = req.validated;
    const result = await dbAsync.run('INSERT INTO deliveries (customer, item, driver, status) VALUES (?, ?, ?, ?)', [customer, item, driver, 'Scheduled']);
    await dbAsync.run('INSERT INTO audit (log) VALUES (?)', [`${new Date().toLocaleString()} - Delivery scheduled: ${item} -> ${customer}`]);
    res.json({ id: result.lastID, customer, item, driver, status: 'Scheduled' });
}));

// Update a delivery
app.put('/api/deliveries/:id', validators.validate(validators.updateDeliverySchema), asyncHandler(async(req, res) => {
    const { id } = req.params;
    const { status } = req.validated;
    await dbAsync.run('UPDATE deliveries SET status = ? WHERE id = ?', [status, id]);
    await dbAsync.run('INSERT INTO audit (log) VALUES (?)', [`${new Date().toLocaleString()} - Delivery ${id} status -> ${status}`]);
    res.json({ id, status });
}));

// Update inventory
app.post('/api/inventory', validators.validate(validators.inventorySchema), asyncHandler(async(req, res) => {
    const { item, amount } = req.validated;
    await dbAsync.run('UPDATE inventory SET qty = qty + ? WHERE item = ?', [amount, item]);
    await dbAsync.run('INSERT INTO audit (log) VALUES (?)', [`${new Date().toLocaleString()} - Inventory updated: ${item} ${amount > 0 ? '+' : ''}${amount}`]);
    const rows = await dbAsync.all('SELECT * FROM inventory');
    const inventory = rows.reduce((acc, row) => { acc[row.item] = row.qty; return acc; }, {});
    res.json({ success: true, inventory });
}));

const host = process.env.HOST || '0.0.0.0';

// ---------- SEED DEFAULT USERS (RUN ONCE) ----------
const seedUsers = [
    { u: "cherry", p: "123", role: "admin" },
    { u: "rajie", p: "123", role: "purchasing" },
    { u: "janex", p: "123", role: "delivery" },
    { u: "rhaa", p: "123", role: "inventory" }
];

seedUsers.forEach(user => {
    db.run(
        "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)", [
            user.u,
            bcrypt.hashSync(user.p, 8),
            user.role
        ]
    );
});

// ---------- GET PURCHASES ----------
app.get("/api/purchases", auth, (req, res) => {
    db.all("SELECT * FROM purchases ORDER BY id DESC", (err, rows) => {
        if (err) return res.sendStatus(500);
        res.json(rows);
    });
});

// ---------- GET DELIVERIES ----------
app.get("/api/deliveries", auth, (req, res) => {
    db.all("SELECT * FROM deliveries ORDER BY id DESC", (err, rows) => {
        if (err) return res.sendStatus(500);
        res.json(rows);
    });
});

// ---------- GET INVENTORY ----------
app.get("/api/inventory", auth, (req, res) => {
    db.all("SELECT * FROM inventory ORDER BY item", (err, rows) => {
        if (err) return res.sendStatus(500);
        res.json(rows);
    });
});

// ---------- DASHBOARD STATS ----------
app.get("/api/dashboard", auth, (req, res) => {
    const stats = {};

    db.get("SELECT COUNT(*) AS total FROM purchases", (e, r) => {
        stats.purchases = r.total;

        db.get("SELECT COUNT(*) AS total FROM deliveries", (e, r) => {
            stats.deliveries = r.total;

            db.get("SELECT COUNT(*) AS total FROM inventory", (e, r) => {
                stats.inventory = r.total;

                db.get(
                    "SELECT COUNT(*) AS total FROM inventory WHERE qty <= 10",
                    (e, r) => {
                        stats.lowStock = r.total;
                        res.json(stats);
                    }
                );
            });
        });
    });
});


app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

// Central error handler
app.use((err, req, res, next) => {
    console.error('API error:', err);
    const status = err && err.status ? err.status : 500;
    res.status(status).json({ error: err && err.message ? err.message : 'Server error' });
});