import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function resetAdmin() {
  console.log('🔄 جاري إعادة ضبط حساب المدير...');
  
  // 1. مسح أي حساب قديم بنفس الرقم
  await db.delete(users).where(eq(users.phone, 'admin'));
  
  // 2. تشفير كلمة المرور الجديدة
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // 3. إضافة المدير من جديد
  await db.insert(users).values({
    name: 'المدير',
    phone: 'admin',
    password: hashedPassword,
    role: 'admin',
  });

  console.log('✅ تم بنجاح! جرب الآن:');
  console.log('رقم الهاتف: admin');
  console.log('كلمة المرور: admin123');
  process.exit(0);
}

resetAdmin().catch(err => {
  console.error('❌ خطأ أثناء إعادة الضبط:', err);
  process.exit(1);
});
