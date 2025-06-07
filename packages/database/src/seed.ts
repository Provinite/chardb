import { PrismaClient } from './generated';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@thclone.com',
      passwordHash: adminPassword,
      displayName: 'Administrator',
      isAdmin: true,
      isVerified: true,
    },
  });

  // Create test user
  const testPassword = await bcrypt.hash('test123', 10);
  const testUser = await prisma.user.create({
    data: {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: testPassword,
      displayName: 'Test User',
      bio: 'A test user for development purposes',
    },
  });

  // Create sample tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'furry', category: 'species' } }),
    prisma.tag.create({ data: { name: 'anthro', category: 'species' } }),
    prisma.tag.create({ data: { name: 'dragon', category: 'species' } }),
    prisma.tag.create({ data: { name: 'wolf', category: 'species' } }),
    prisma.tag.create({ data: { name: 'original', category: 'type' } }),
    prisma.tag.create({ data: { name: 'commission', category: 'type' } }),
  ]);

  // Create sample character
  const character = await prisma.character.create({
    data: {
      name: 'Aria Moonwhisper',
      species: 'Wolf',
      age: '23',
      gender: 'Female',
      description: 'A mysterious wolf with silver fur and glowing blue eyes.',
      personality: 'Quiet, observant, and fiercely loyal to her friends.',
      backstory: 'Born in the northern mountains, Aria learned magic from the ancient spirits.',
      ownerId: testUser.id,
      creatorId: testUser.id,
      tags: ['wolf', 'magic', 'original'],
    },
  });

  // Create sample gallery
  const gallery = await prisma.gallery.create({
    data: {
      name: 'Aria\'s Art Collection',
      description: 'Official artwork of Aria Moonwhisper',
      ownerId: testUser.id,
      characterId: character.id,
    },
  });

  console.log('Database seeded successfully!');
  console.log('Created users:', { admin: admin.username, testUser: testUser.username });
  console.log('Created character:', character.name);
  console.log('Created gallery:', gallery.name);
  console.log('Created tags:', tags.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });