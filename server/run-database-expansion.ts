#!/usr/bin/env tsx

import { expandSourdoughDatabase } from './expand-database';

async function main() {
  try {
    console.log('🚀 Starting database expansion...');
    const addedCount = await expandSourdoughDatabase();
    console.log(`\n✅ Successfully added ${addedCount} restaurants to the database!`);
  } catch (error) {
    console.error('❌ Database expansion failed:', error);
    process.exit(1);
  }
}

main();