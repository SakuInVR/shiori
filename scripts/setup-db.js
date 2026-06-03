const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '..', '.env');
let dbUrl = process.env.DATABASE_URL || '';

if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL\s*=\s*"([^"]+)"/) || 
                envContent.match(/DATABASE_URL\s*=\s*'([^']+)'/) || 
                envContent.match(/DATABASE_URL\s*=\s*([^\s]+)/);
  if (match) {
    dbUrl = match[1];
  }
}

let provider = 'sqlite';

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
  provider = 'postgresql';
  console.log('[Database Setup] Detected PostgreSQL connection URL.');
} else {
  provider = 'sqlite';
  console.log('[Database Setup] SQLite fallback used (no PostgreSQL DATABASE_URL found).');
  // Write default local .env if it doesn't exist
  if (!fs.existsSync(envPath)) {
    const defaultEnv = 
`DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="shiori-local-development-secret-key-12345"
NEXTAUTH_URL="http://localhost:3000"
`;
    fs.writeFileSync(envPath, defaultEnv, 'utf8');
    console.log('[Database Setup] Created default local .env file with SQLite configurations.');
  }
}

if (fs.existsSync(schemaPath)) {
  let content = fs.readFileSync(schemaPath, 'utf8');
  
  // Regex to replace: provider = "..."
  const updatedContent = content.replace(/provider\s*=\s*"[^"]+"/, `provider = "${provider}"`);
  
  fs.writeFileSync(schemaPath, updatedContent, 'utf8');
  console.log(`[Database Setup] Updated schema.prisma successfully with provider: "${provider}".`);
} else {
  console.error(`[Database Setup] Error: schema.prisma not found at ${schemaPath}`);
  process.exit(1);
}
