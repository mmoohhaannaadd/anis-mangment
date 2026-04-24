import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function addDev() {
  console.log('🔄 جاري إضافة حساب المطور...');
  
  // مسح أي حساب قديم للمطور (إن وجد)
  await db.delete(users).where(eq(users.phone, 'dev'));
  
  // تشفير كلمة المرور 
  const hashedPassword = await bcrypt.hash('dev123', 10);
  
  // إضافة المطور بصلاحيات أدمن
  await db.insert(users).values({
    name: 'المطور (تجارب)',
    phone: 'dev',
    password: hashedPassword,
    role: 'admin',
  });

  console.log('✅ تم بنجاح! يمكنك الدخول الآن باستخدام:');
  console.log('رقم الهاتف: dev');
  console.log('كلمة المرور: dev123');
  process.exit(0);
}

addDev().catch(err => {
  console.error('❌ خطأ أثناء الإضافة:', err);
  process.exit(1);
});
