const mysql = require('mysql2/promise');

async function fixHQ() {
  const url = "mysql://45fNy9AFAWj7Kur.root:UX2Xarz3IIVeLvVu@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/omnicore_hq?ssl={\"rejectUnauthorized\":true}";
  
  try {
    const connection = await mysql.createConnection(url);
    console.log("Connected to omnicore_hq!");

    try {
      await connection.query("ALTER TABLE users ADD COLUMN emailVerified BOOLEAN DEFAULT false;");
      console.log("Added emailVerified");
    } catch(e) {
      console.log("emailVerified might exist:", e.message);
    }
    
    try {
      await connection.query("ALTER TABLE users ADD COLUMN emailVerificationToken VARCHAR(255);");
      console.log("Added emailVerificationToken");
    } catch(e) {
      console.log("emailVerificationToken might exist:", e.message);
    }

    try {
      await connection.query("ALTER TABLE users ADD COLUMN emailVerificationExpiry DATETIME;");
      console.log("Added emailVerificationExpiry");
    } catch(e) {
      console.log("emailVerificationExpiry might exist:", e.message);
    }

    try {
      await connection.query("ALTER TABLE users ADD COLUMN googleId VARCHAR(255);");
      console.log("Added googleId");
    } catch(e) {
      console.log("googleId might exist:", e.message);
    }
    
    await connection.end();
    console.log("Done.");
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

fixHQ();
