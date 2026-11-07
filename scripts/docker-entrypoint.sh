#!/bin/sh
set -eu

echo "Waiting for database..."
i=0
until node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.end()).catch((e)=>{console.error(e.message);process.exit(1)})"; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "Database not ready after 60s"
    exit 1
  fi
  sleep 2
done

npm run db:migrate
npx tsx src/scripts/seed.ts
exec npm run start
