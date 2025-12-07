/* --- Variables --- */
let users = [];
const menuItems = [
  "Espresso", "Americano", "Cappuccino", "Latte", "Mocha",
  "Caramel Macchiato", "Iced Coffee", "Hot Chocolate",
  "Matcha Latte", "Croissant", "Bagel", "Cheesecake"
];

let purchases = [];
let deliveries = [];
let inventory = {};
let audit = [];

// Start the app
function initApp(){
  loadData();
  populateMenu();
  renderAll();

  // If user is already logged in, show the dashboard
  if(sessionStorage.user){
    loginPage.style.display="none";
    app.style.display="flex";
    applyRole(); 
    openPage("dashboard");
  }
}

/* --- Save and Load Data --- */
// Load data from memory
function loadData() {
  const storedUsers = localStorage.getItem("cc_users");
  if(storedUsers) {
    // If data exists, use it
    users = JSON.parse(storedUsers);
    purchases = JSON.parse(localStorage.getItem("cc_purchases") || "[]");
    deliveries = JSON.parse(localStorage.getItem("cc_deliveries") || "[]");
    inventory = JSON.parse(localStorage.getItem("cc_inventory") || "{}");
    audit = JSON.parse(localStorage.getItem("cc_audit") || "[]");
  } else {
    // If no data, use default demo data
    initDemoData();
    saveData();
  }
}

// Save data to memory (Local Storage)
function saveData() {
  localStorage.setItem("cc_users", JSON.stringify(users));
  localStorage.setItem("cc_purchases", JSON.stringify(purchases));
  localStorage.setItem("cc_deliveries", JSON.stringify(deliveries));
  localStorage.setItem("cc_inventory", JSON.stringify(inventory));
  localStorage.setItem("cc_audit", JSON.stringify(audit));
}

// Add items to the dropdown menu
function populateMenu(){
  const select = document.getElementById("dItem");
  if(!select) return;
  select.innerHTML = '<option value="">-- Select Item --</option>';
  menuItems.forEach(item => {
    let opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

// Create default data
function initDemoData(){
  users = [
    {u:"cherry", p:"123", role:"admin"},
    {u:"rajie", p:"123", role:"purchasing"},
    {u:"janex", p:"123", role:"delivery"},
    {u:"rhaa", p:"123", role:"inventory"},
    {u:"norman", p:"123", role:"admin"}
  ];
  
  purchases = [
    {item:"Coffee Beans", qty:20, supplier:"Local Roaster", status:"Approved"},
    {item:"Milk", qty:20, supplier:"Dairy Supplier", status:"Approved"}
  ];
  
  inventory = {
    "Coffee Beans": 30, "Milk": 25, "Sugar": 40, "Paper Cups": 100, 
    "Syrup (Caramel)": 10, "Syrup (Choco)": 10, "Matcha Powder": 15,
    "Croissant": 10, "Bagel": 8, "Cheesecake": 5
  };

  audit = [new Date().toLocaleString()+" - System Loaded"];
}

/* --- Login System --- */
function login(){
  let u = loginUser.value.toLowerCase().trim();
  let p = loginPass.value.trim();
  let user = users.find(x => x.u === u && x.p === p);

  if(!user){ alert("Invalid login."); return; }

  sessionStorage.setItem("user", user.u);
  sessionStorage.setItem("role", user.role);

  loginPage.style.display="none";
  app.style.display="flex";
  
  logAction(`User logged in: ${user.u}`);
  applyRole(); 
  openPage("dashboard");
}

function logout(){
  sessionStorage.clear();
  location.reload();
}

// Show correct menu buttons based on role
function applyRole() {
  const role = sessionStorage.getItem("role");
  const navPurchasing = document.getElementById("navPurchasing");
  const navDelivery = document.getElementById("navDelivery");
  const navInventory = document.getElementById("navInventory");
  const navUsers = document.getElementById("navUsers");

  // Show all first
  if(navPurchasing) navPurchasing.classList.remove("hidden");
  if(navDelivery) navDelivery.classList.remove("hidden");
  if(navInventory) navInventory.classList.remove("hidden");
  if(navUsers) navUsers.classList.add("hidden");

  if (!role) return; 

  // Check roles
  if (role === "admin") {
      if(navUsers) navUsers.classList.remove("hidden");
      renderUsers(); 
      return;
  }

  if (role === "purchasing") {
      if(navDelivery) navDelivery.classList.add("hidden");
  } else if (role === "delivery") {
      if(navPurchasing) navPurchasing.classList.add("hidden");
      if(navInventory) navInventory.classList.add("hidden");
  } else if (role === "inventory") {
      if(navPurchasing) navPurchasing.classList.add("hidden");
      if(navDelivery) navDelivery.classList.add("hidden");
  }
}

/* --- Navigation --- */
function openPage(id){
    document.querySelectorAll(".page").forEach(p => p.style.display="none");
    document.getElementById(id).style.display="block";
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    // Highlight the clicked button
    const activeBtn = document.querySelector(`a[onclick="openPage('${id}')"]`);
    if(activeBtn) activeBtn.classList.add('active');

    updateDashboard();
    if(id === "reports") updateReports();
}

/* --- User Management (Admin) --- */
function addUser() {
  const name = document.getElementById("uName").value.trim().toLowerCase();
  const pass = document.getElementById("uPass").value.trim();
  const role = document.getElementById("uRole").value;

  if(!name || !pass) { alert("Please enter username and password"); return; }
  
  if(users.some(u => u.u === name)) { alert("Username already exists!"); return; }

  users.push({u: name, p: pass, role: role});
  
  document.getElementById("uName").value = "";
  document.getElementById("uPass").value = "";

  logAction(`Admin added new user: ${name} (${role})`);
  saveData();
  renderUsers();
}

function deleteUser(index) {
  const userToDelete = users[index];
  
  if(userToDelete.u === sessionStorage.getItem("user")) {
    alert("You cannot delete your own account while logged in.");
    return;
  }

  if(confirm(`Are you sure you want to delete user '${userToDelete.u}'?`)) {
    users.splice(index, 1);
    logAction(`Admin deleted user: ${userToDelete.u}`);
    saveData();
    renderUsers();
  }
}

function renderUsers() {
  const table = document.getElementById("usersTable");
  if(!table) return;

  table.innerHTML = users.map((user, index) => `
    <tr>
      <td>${user.u}</td>
      <td>${user.p}</td>
      <td><span class="status-badge status-scheduled">${user.role}</span></td>
      <td class="action-cell">
        <button class="btn-small btn-reject" onclick="deleteUser(${index})">
          <i class="fas fa-trash"></i> Delete
        </button>
      </td>
    </tr>
  `).join("");
}

/* --- Purchasing Logic --- */
function addPurchase(){
  let item = pItem.value.trim();
  let qty = parseInt(pQty.value);
  let supplier = pSupplier.value.trim();

  if(!item || !qty || !supplier){ alert("Fill all fields"); return; }

  purchases.push({item, qty, supplier, status:"Pending"});
  pItem.value=""; pQty.value=""; pSupplier.value="";
  
  logAction(`Order Created: ${item} (+${qty})`);
  saveData();
  renderPurchases();
  updateDashboard();
}

function approvePurchase(i){
  if(purchases[i].status !== "Pending") return;
  purchases[i].status = "Approved";

  let item = purchases[i].item;
  inventory[item] = (inventory[item]||0) + purchases[i].qty;
  
  logAction(`Approved: ${item}. Stock increased.`);
  saveData();
  renderAll();
}

function rejectPurchase(i){
  if(purchases[i].status !== "Pending") return;
  purchases[i].status = "Rejected";
  saveData();
  renderPurchases();
}

function cancelPurchase(i){
    if(purchases[i].status === "Approved") return alert("Cannot cancel approved items");
    purchases[i].status = "Cancelled";
    saveData();
    renderPurchases();
}

/* --- Delivery Logic --- */
function scheduleDelivery(){
  let c = dCustomer.value.trim();
  let item = dItem.value;
  let driver = dDriver.value.trim();
  if(!c || !item || !driver) { alert("Fill all fields"); return; }

  deliveries.push({customer:c, item:item, driver:driver, status:"Scheduled"});
  dCustomer.value=""; dDriver.value=""; dItem.selectedIndex=0;
  
  logAction(`Order Scheduled: ${item} for ${c}`);
  saveData();
  renderDeliveries();
  updateDashboard();
}

function setDeliveryStatus(i, stat){
  deliveries[i].status = stat;
  saveData();
  renderDeliveries();
  updateDashboard();
}

/* --- Inventory Logic --- */
function changeStock(item, amount){
    if(!inventory[item]) inventory[item] = 0;
    
    inventory[item] += amount;
    
    if(inventory[item] < 0) inventory[item] = 0;

    logAction(`Manual Stock Edit: ${item} (${amount > 0 ? '+' : ''}${amount})`);
    saveData();
    renderInventory();
    updateDashboard();
}

/* --- Display Tables (Render) --- */
function renderPurchases(){
  purchaseTable.innerHTML = purchases.map((p,i)=>`
    <tr>
      <td>${p.item}</td>
      <td>${p.qty}</td>
      <td>${p.supplier}</td>
      <td class="status-cell"><span class="status-badge status-${p.status.toLowerCase().replace(' ','')}">${p.status}</span></td>
      <td class="action-cell">
        <button class="btn-small btn-approve" onclick="approvePurchase(${i})">✔</button>
        <button class="btn-small btn-reject" onclick="rejectPurchase(${i})">✘</button>
        <button class="btn-small btn-cancel" onclick="cancelPurchase(${i})">⊘</button>
      </td>
    </tr>`).join("");
}

function renderDeliveries(){
  deliveryTable.innerHTML = deliveries.map((d,i)=>`
    <tr>
      <td>${d.customer}</td>
      <td>${d.item}</td>
      <td>${d.driver}</td>
      <td class="status-cell"><span class="status-badge status-${d.status.toLowerCase().replace(' ','')}">${d.status}</span></td>
      <td class="action-cell">
        <button class="btn-small btn-transit" onclick="setDeliveryStatus(${i},'In Transit')">Transit</button>
        <button class="btn-small btn-delivered" onclick="setDeliveryStatus(${i},'Delivered')">Done</button>
      </td>
    </tr>`).join("");
}

function renderInventory(){
  inventoryTable.innerHTML = Object.keys(inventory).map(k=>`
    <tr>
      <td>${k}</td>
      <td class="${inventory[k]<=10 ? 'low-stock' : ''}"><strong>${inventory[k]}</strong></td>
      <td class="action-cell">
        <button class="btn-small btn-edit-plus" onclick="changeStock('${k}', 1)">+</button>
        <button class="btn-small btn-edit-minus" onclick="changeStock('${k}', -1)">-</button>
      </td>
    </tr>`).join("");
}

function logAction(msg){
    audit.unshift(`${new Date().toLocaleTimeString()} - ${msg}`);
    saveData();
    renderAudit();
}
function renderAudit(){
    auditTable.innerHTML = audit.map(a=>`<tr><td><i class="fas fa-caret-right"></i> ${a}</td></tr>`).join("");
}

function renderAll(){
    renderPurchases();
    renderDeliveries();
    renderInventory();
    renderAudit();
    updateDashboard();
}

function updateDashboard(){
    dPurch.textContent = purchases.length;
    dDel.textContent = deliveries.length;
    dInv.textContent = Object.keys(inventory).length;
    dLow.textContent = Object.values(inventory).filter(x=>x<=10).length;
}

function updateReports(){
    rPurch.textContent = purchases.length;
    rDel.textContent = deliveries.length;
    let app=0, pen=0, rej=0; 
    purchases.forEach(p=>{ if(p.status=="Approved") app++; else if(p.status=="Pending") pen++; else rej++; });
    rApproved.textContent=app; rPending.textContent=pen; rRejected.textContent=rej;
    let tr=0, dl=0;
    deliveries.forEach(d=>{ if(d.status=="In Transit") tr++; else if(d.status=="Delivered") dl++; });
    rTransit.textContent=tr; rDelivered.textContent=dl;
}