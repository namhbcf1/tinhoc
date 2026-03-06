// ========================================
// Script chạy migration qua API
// ========================================

const API_URL = 'https://vantrangedu-api.bangachieu2.workers.dev';

async function runMigration() {
  try {
    console.log('🔍 Kiểm tra bảng hiện tại...');
    const checkRes = await fetch(`${API_URL}/migrate/check`);
    const checkData = await checkRes.json();
    console.log('📊 Trạng thái:', checkData);

    if (checkData.data.payments_exists && checkData.data.certificates_exists) {
      console.log('✅ Các bảng đã tồn tại!');
      return;
    }

    console.log('\n🚀 Đang tạo bảng payments và certificates...');
    const migrateRes = await fetch(`${API_URL}/migrate/payments-certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const migrateData = await migrateRes.json();
    console.log('📝 Kết quả:', migrateData);

    if (migrateData.success) {
      console.log('\n✅ Migration thành công!');
      
      // Kiểm tra lại
      console.log('\n🔍 Kiểm tra lại...');
      const verifyRes = await fetch(`${API_URL}/migrate/check`);
      const verifyData = await verifyRes.json();
      console.log('📊 Trạng thái sau migration:', verifyData);
    } else {
      console.error('❌ Migration thất bại:', migrateData);
    }
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

runMigration();
