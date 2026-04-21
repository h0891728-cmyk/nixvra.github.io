const { execSync } = require('child_process');

async function run() {
  const dbs = ['omnicore_hq', 'omnicore_demo_school', 'omnicore_demo_clinic', 'omnicore_demo_realty'];
  for (const db of dbs) {
    const url = `mysql://45fNy9AFAWj7Kur.root:UX2Xarz3IIVeLvVu@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/${db}?sslaccept=strict`;
    console.log(`Pushing to ${db}...`);
    process.env.DATABASE_URL = url;
    execSync(`npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, {
      stdio: 'inherit',
      env: process.env
    });
  }
}
run();
