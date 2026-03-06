// ========================================
// SCRIPT TẠO TÀI KHOẢN ADMIN QUA API
// Chạy: node create-admins-api.js
// ========================================

const API_URL = 'https://vantrangedu-api.bangachieu2.workers.dev/auth/create-admin';

const admins = [
  { username: 'admin1', full_name: 'Quản Trị Viên 1', role: 'admin' },
  { username: 'admin2', full_name: 'Quản Trị Viên 2', role: 'admin' },
  { username: 'admin3', full_name: 'Quản Trị Viên 3', role: 'admin' },
  { username: 'admin4', full_name: 'Quản Trị Viên 4', role: 'admin' },
  { username: 'admin5', full_name: 'Quản Trị Viên 5', role: 'admin' },
];

const password = 'admin12345';

async function createAdmin(adminData) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...adminData,
        password,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Tạo thành công: ${adminData.username}`);
      return true;
    } else {
      console.error(`❌ Lỗi tạo ${adminData.username}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Lỗi khi tạo ${adminData.username}:`, error.message);
    return false;
  }
}

async function createAllAdmins() {
  console.log('🚀 Bắt đầu tạo 5 tài khoản admin...\n');

  for (const admin of admins) {
    await createAdmin(admin);
    // Đợi 500ms giữa mỗi request
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✨ Hoàn thành!');
  console.log('\n📋 Thông tin đăng nhập:');
  admins.forEach(admin => {
    console.log(`   Username: ${admin.username} | Password: ${password}`);
  });
}

createAllAdmins();
