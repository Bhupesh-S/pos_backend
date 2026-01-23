

const BASE = 'http://localhost:4001/api';
let token = '';

async function login() {
  console.log('Logging in...');
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  token = data.token;
  console.log('Login successful');
}

async function testCategories() {
  console.log('Testing Categories...');
  const name = `Cat_${Date.now()}`;
  // Create
  const res1 = await fetch(`${BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name })
  });
  if (!res1.ok) {
    const txt = await res1.text();
    throw new Error(`Create Category failed: ${res1.status} - ${txt}`);
  }
  console.log('Category created');

  // List
  const res2 = await fetch(`${BASE}/categories`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res2.json();
  if (!data.categories.some(c => c.name === name)) throw new Error('Category not found in list');
  console.log('Category listed');
}

async function testUsers() {
  console.log('Testing Users List...');
  const res = await fetch(`${BASE}/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`List Users failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.users)) throw new Error('Users response invalid');
  console.log('Users listed: ', data.users.length);
}

async function testAnalytics() {
  console.log('Testing Analytics...');
  const res = await fetch(`${BASE}/analytics/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Analytics failed: ${res.status}`);
  const data = await res.json();
  if (!data.stats || !data.topSelling) throw new Error('Analytics structure invalid');
  console.log('Analytics OK');
}

async function run() {
  try {
    await login();
    await testCategories();
    await testUsers();
    await testAnalytics();
    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.error(e);
    const fs = await import('fs');
    fs.writeFileSync('error.log', e.toString() + '\\n' + (e.message || ''));
    process.exit(1);
  }
}

run();
