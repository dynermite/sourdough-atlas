import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For local development, allow fallback to mock database
let pool: any;
let db: any;

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'file:./sourdough-atlas.db') {
  console.log('⚠️  DATABASE_URL not configured for production database. Using local development mode.');
  console.log('📝 To see the full app with data, you need to:');
  console.log('   1. Get a free Neon database at https://neon.tech');
  console.log('   2. Update DATABASE_URL in .env with your connection string');
  console.log('   3. Run: npm run db:push');
  console.log('   4. Restart the server');
  console.log('');
  console.log('🚀 For now, starting with mock database...');
  
  // Create a simple mock that satisfies the interface
  const mockClient = {
    query: () => Promise.resolve({ rows: [] }),
    end: () => Promise.resolve()
  };
  
  pool = mockClient as any;
  db = {
    select: () => ({ from: () => Promise.resolve([]) }),
    insert: () => ({ values: () => Promise.resolve() }),
    query: { restaurants: { findMany: () => Promise.resolve([]) } }
  } as any;
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };