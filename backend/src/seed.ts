import { db } from './db';
import { users } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await db.insert(users).values({
    name: 'المدير العام',
    phone: 'admin',
    password: hashedPassword,
    role: 'admin',
    whatsapp: '+1234567890',
  });
  
  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
