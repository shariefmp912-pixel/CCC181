let users = [
    { u: "cherry", p: "123", role: "admin" },
    { u: "rajie", p: "123", role: "purchasing" },
    { u: "janex", p: "123", role: "delivery" },
    { u: "rhaa", p: "123", role: "inventory" },
    { u: "norman", p: "123", role: "admin" }
];

let purchases = [
    { id: 1, item: "Coffee Beans", qty: 20, supplier: "Local Roaster", status: "Approved" },
    { id: 2, item: "Milk", qty: 20, supplier: "Dairy Supplier", status: "Approved" }
];

let deliveries = [];

let inventory = {
    "Coffee Beans": 30,
    "Milk": 25,
    "Sugar": 40,
    "Paper Cups": 100,
    "Syrup (Caramel)": 10,
    "Syrup (Choco)": 10,
    "Matcha Powder": 15,
    "Croissant": 10,
    "Bagel": 8,
    "Cheesecake": 5
};

let audit = [`${new Date().toLocaleString()} - System Loaded`];

module.exports = {
    users,
    purchases,
    deliveries,
    inventory,
    audit
};