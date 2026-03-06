// ========================================
// SCRIPT TẠO TÀI KHOẢN ADMIN
// Chạy script này để tạo 5 tài khoản admin
// ========================================

import bcrypt from 'bcryptjs';

const password = 'admin12345';
const passwordHash = await bcrypt.hash(password, 10);

const admins = [
  { username: 'admin1', full_name: 'Quản Trị Viên 1', role: 'admin' },
  { username: 'admin2', full_name: 'Quản Trị Viên 2', role: 'admin' },
  { username: 'admin3', full_name: 'Quản Trị Viên 3', role: 'admin' },
  { username: 'admin4', full_name: 'Quản Trị Viên 4', role: 'admin' },
  { username: 'admin5', full_name: 'Quản Trị Viên 5', role: 'admin' },
];

console.log('-- SQL Script để tạo 5 tài khoản admin --\n');
console.log('-- Password cho tất cả: admin12345\n');

admins.forEach((admin, index) => {
  console.log(`INSERT INTO admins (username, password_hash, full_name, role) VALUES`);
  console.log(`('${admin.username}', '${passwordHash}', '${admin.full_name}', '${admin.role}');`);
  if (index < admins.length - 1) {
    console.log('');
  }
});

console.log('\n-- Hoặc chạy API endpoint: POST /auth/create-admin với body:');
console.log(JSON.stringify({
  username: 'admin1',
  password: 'admin12345',
  full_name: 'Quản Trị Viên 1',
  role: 'admin'
}, null, 2));
