/**
 * Quick test to verify typed JSON is working correctly
 * This file can be deleted after testing
 */
import { PrismaClient } from '@chardb/database';

const prisma = new PrismaClient();

async function testTypedJson() {
  try {
    // Test creating a character with typed trait values
    const character = await prisma.character.create({
      data: {
        name: 'Test Character',
        ownerId: 'test-user-id',
        traitValues: [
          { traitId: 'eye-color-trait-id', value: 'blue' },
          { traitId: 'height-trait-id', value: 180 },
          { traitId: 'is-magic-trait-id', value: true },
          { traitId: 'notes-trait-id', value: null },
        ], // This should be fully typed!
      },
    });

    console.log('✅ Character created with typed trait values');

    // Test reading and accessing typed values
    const found = await prisma.character.findUnique({
      where: { id: character.id },
    });

    if (found) {
      // These should be fully typed with TypeScript intellisense
      found.traitValues.forEach((trait) => {
        console.log(`Trait ${trait.traitId}: ${trait.value}`);
        // TypeScript should know about traitId and value properties
      });
    }

    // Clean up
    await prisma.character.delete({
      where: { id: character.id },
    });

    console.log('✅ Typed JSON test completed successfully');
  } catch (error) {
    console.error('❌ Typed JSON test failed:', error);
  }
}

// Export for potential use, but don't auto-run
export { testTypedJson };
