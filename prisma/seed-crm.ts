import dotenv from 'dotenv'
dotenv.config({ path: './.env.local' })
import bcrypt from 'bcryptjs'

async function hashPassword(pw: string) {
  return await bcrypt.hash(pw, 10)
}

async function main() {
  const { masterDb, getTenantDb } = await import('../src/lib/db')
  console.log('🌱 Trimming existing CRM data and seeding dummy entities...')

  const tenants = await masterDb.tenant.findMany()
  const defaultPass = await hashPassword('password123')

  for (const tenant of tenants) {
    if (tenant.databaseName === 'test') continue // skip default master mapped
    
    console.log(`\n===========================================`)
    console.log(`Seeding: ${tenant.name} (${tenant.industry}) [${tenant.databaseName}]`)
    const db = await getTenantDb(tenant.databaseName)

    try {
      // 1. CLEAR EXISTING NON-ADMIN ENTITIES & USERS TO AVOID DUPLICATES
      console.log('  ...cleaning old entities')
      const admins = await db.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'TENANT_ADMIN'] } }})
      const adminIds = admins.map(a => a.publicId)
      
      await db.businessEntity.deleteMany({})
      await db.user.deleteMany({ where: { role: { notIn: ['SUPER_ADMIN', 'TENANT_ADMIN'] } } })
      
      const seedUsers: any[] = []
      const seedEntities: any[] = []

      // 2. CONSTRUCT DATA BASED ON INDUSTRY
      if (tenant.industry === 'EDUCATION') {
        const combos = [
          { type: 'TEACHER', role: 'STAFF', name: 'Mrs. Sarah Connor', contact: 'sarah.c@sunrise.edu', email: 'sarah.c@sunrise.edu', coreTrait: 'M.Sc Mathematics', coreValue: 4500, description: 'Head of the Mathematics department.' },
          { type: 'TEACHER', role: 'STAFF', name: 'Mr. John Keating', contact: 'john.k@sunrise.edu', email: 'john.k@sunrise.edu', coreTrait: 'Ph.D Literature', coreValue: 4800, description: 'Senior English Literature professor.' },
          { type: 'STUDENT', role: 'CUSTOMER', name: 'Alice Smith', contact: 'alice.s@student.edu', email: 'alice.s@student.edu', coreTrait: 'Grade 10 - A', coreValue: 1200, description: 'Honors student in science program.' },
          { type: 'STUDENT', role: 'CUSTOMER', name: 'Bob Roberts', contact: 'bob.r@student.edu', email: 'bob.r@student.edu', coreTrait: 'Grade 10 - B', coreValue: 1200, description: 'JV Basketball team captain.' },
          { type: 'STAFF', role: 'STAFF', name: 'Dave Janitor', contact: 'dave@sunrise.edu', email: 'dave@sunrise.edu', coreTrait: 'Maintenance', coreValue: 3200, description: 'Night shift maintenance head.' }
        ]
        combos.forEach(c => {
           seedUsers.push({ email: c.email, role: c.role as any, passwordHash: defaultPass })
           seedEntities.push({ emailRef: c.email, type: c.type, name: c.name, contact: c.contact, coreTrait: c.coreTrait, coreValue: c.coreValue, description: c.description })
        })
      } 
      else if (tenant.industry === 'REAL_ESTATE') {
        const combos = [
          { type: 'AGENT', role: 'STAFF', name: 'Agent Smith', contact: 'smith@horizon.com', email: 'smith@horizon.com', coreTrait: 'Senior Broker', coreValue: 8000, description: 'Top sales agent 2024.' },
          { type: 'AGENT', role: 'STAFF', name: 'Agent Jones', contact: 'jones@horizon.com', email: 'jones@horizon.com', coreTrait: 'Junior Agent', coreValue: 4500, description: 'Focuses on downtown leases.' },
          { type: 'LEAD', role: 'CUSTOMER', name: 'Bruce Wayne', contact: 'bruce@wayne.com', email: 'bruce@wayne.com', coreTrait: 'Luxury Prospect', coreValue: 15000000, description: 'Looking for a penthouse suite.' },
          { type: 'CUSTOMER', role: 'CUSTOMER', name: 'Clark Kent', contact: 'clark@dailyplanet.com', email: 'clark@dailyplanet.com', coreTrait: 'Renter', coreValue: 2000, description: 'Seeking a 1BHK near Daily Planet.' },
        ]
        combos.forEach(c => {
           seedUsers.push({ email: c.email, role: c.role as any, passwordHash: defaultPass })
           seedEntities.push({ emailRef: c.email, type: c.type, name: c.name, contact: c.contact, coreTrait: c.coreTrait, coreValue: c.coreValue, description: c.description })
        })
        
        // Properties without users
        seedEntities.push({ emailRef: null, type: 'PROPERTY', name: 'Sunset Villa', contact: '123 Sunset Blvd', coreTrait: '3BHK Villa', coreValue: 850000, description: 'Beautiful sunset-facing villa.' })
        seedEntities.push({ emailRef: null, type: 'PROPERTY', name: 'Metropolis Flat', contact: 'Unit 402', coreTrait: '1BHK Apartment', coreValue: 450000, description: 'Downtown high-rise.' })
      }
      else if (tenant.industry === 'HEALTHCARE') {
        const combos = [
          { type: 'STAFF', role: 'STAFF', name: 'Dr. Gregory House', contact: 'house@medicare.com', email: 'house@medicare.com', coreTrait: 'Head of Diagnostics', coreValue: 18000, description: 'Specializes in rare diseases.' },
          { type: 'STAFF', role: 'STAFF', name: 'Nurse Joy', contact: 'joy@medicare.com', email: 'joy@medicare.com', coreTrait: 'Head Nurse', coreValue: 6000, description: 'Pediatrics department.' },
          { type: 'PATIENT', role: 'CUSTOMER', name: 'Patient Zero', contact: 'zero@gmail.com', email: 'zero@gmail.com', coreTrait: 'Outpatient', coreValue: 500, description: 'Routine checkup.' },
        ]
        combos.forEach(c => {
           seedUsers.push({ email: c.email, role: c.role as any, passwordHash: defaultPass })
           seedEntities.push({ emailRef: c.email, type: c.type, name: c.name, contact: c.contact, coreTrait: c.coreTrait, coreValue: c.coreValue, description: c.description })
        })
      }
      else if (tenant.industry === 'SERVICES') {
        const combos = [
          { type: 'STAFF', role: 'STAFF', name: 'Alara Vance', contact: 'alara@omnicore.app', email: 'alara@omnicore.app', coreTrait: 'Product Lead', coreValue: 85000, description: 'Super Admin HQ team.' },
          { type: 'STAFF', role: 'STAFF', name: 'Jared Dunn', contact: 'jared@omnicore.app', email: 'jared@omnicore.app', coreTrait: 'Operations', coreValue: 65000, description: 'Super Admin HQ team.' },
          { type: 'VENDOR', role: 'CUSTOMER', name: 'CloudNet Inc.', contact: 'billing@cloudnet.io', email: 'billing@cloudnet.io', coreTrait: 'AWS Partner', coreValue: 12000, description: 'Hosting provider.' },
          { type: 'CUSTOMER', role: 'CUSTOMER', name: 'MegaCorp', contact: 'info@megacorp.com', email: 'info@megacorp.com', coreTrait: 'Enterprise Client', coreValue: 150000, description: 'Enterprise SaaS customer.' },
        ]
        combos.forEach(c => {
           seedUsers.push({ email: c.email, role: c.role as any, passwordHash: defaultPass })
           seedEntities.push({ emailRef: c.email, type: c.type, name: c.name, contact: c.contact, coreTrait: c.coreTrait, coreValue: c.coreValue, description: c.description })
        })
      }

      // 3. INSERT USERS
      console.log(`  ...creating ${seedUsers.length} users with password 'password123'`)
      await db.user.createMany({ data: seedUsers })

      // Pull them back to get IDs
      const insertedUsers = await db.user.findMany({ where: { email: { in: seedUsers.map(s => s.email) } } })

      // 4. INSERT ENTITIES
      console.log(`  ...creating ${seedEntities.length} entities and binding to users`)
      for (const e of seedEntities) {
         let matchedUserId = null;
         if (e.emailRef) {
           const match = insertedUsers.find(u => u.email === e.emailRef)
           if (match) matchedUserId = match.publicId
         }

         await db.businessEntity.create({
           data: {
             type: e.type as any,
             name: e.name,
             contact: e.contact,
             userId: matchedUserId,
             coreTrait: e.coreTrait || null,
             coreValue: e.coreValue || null,
             description: e.description || null
           }
         })
      }

      // 5. BUILD THE ENTITY-RELATION GRAPH  ───────────────────────────────────
      console.log('  ...building polymorphic relation graph')
      
      // Clear existing relations for clean re‑seed
      await (db as any).$executeRawUnsafe(`DELETE FROM entity_relations`)

      if (tenant.industry === 'EDUCATION') {
        // Fetch the inserted entities by name for linking
        const all = await db.businessEntity.findMany({ where: { deletedAt: null } })
        const find = (name: string) => all.find(e => e.name === name)

        const sarah = find('Mrs. Sarah Connor')
        const john  = find('Mr. John Keating')
        const alice = find('Alice Smith')
        const bob   = find('Bob Roberts')
        const jayaParent = find('Mrs. Priya Smith') // parent we'll create below

        // Create GROUP entities for class sections
        const grade10A = await db.businessEntity.upsert({
          where: { publicId: '00000000-0000-0000-0000-100000000001' },
          create: { publicId: '00000000-0000-0000-0000-100000000001', type: 'GROUP', name: 'Grade 10 - Section A', contact: null, coreTrait: 'Academic Class', description: 'Main section for Grade 10 students.' },
          update: {}
        })
        const grade11B = await db.businessEntity.upsert({
          where: { publicId: '00000000-0000-0000-0000-100000000002' },
          create: { publicId: '00000000-0000-0000-0000-100000000002', type: 'GROUP', name: 'Grade 11 - Section B', contact: null, coreTrait: 'Academic Class', description: 'Literary focus section for Grade 11.' },
          update: {}
        })

        // Create Parent entity with login
        const parentHash = await hashPassword('password123')
        const parentUser = await db.user.upsert({
          where: { email: 'priya.smith@parent.edu' },
          create: { email: 'priya.smith@parent.edu', role: 'CUSTOMER', passwordHash: parentHash },
          update: {}
        })
        const parentEntity = await db.businessEntity.upsert({
          where: { publicId: '00000000-0000-0000-0000-200000000001' },
          create: { publicId: '00000000-0000-0000-0000-200000000001', type: 'PARENT', name: 'Mrs. Priya Smith', contact: 'priya.smith@parent.edu', userId: parentUser.publicId, description: 'Parent of Alice Smith.' },
          update: {}
        })

        // --- Relation Graph ---
        const rels: any[] = []

        // Teacher → TEACHES_IN → GROUP  (with subject metadata)
        if (sarah && grade10A) rels.push({ sourceEntityId: sarah.publicId, targetEntityId: grade10A.publicId, relationType: 'TEACHES_IN', metadata: { subject: 'Mathematics', periods_per_week: '6' } })
        if (john  && grade11B) rels.push({ sourceEntityId: john.publicId,  targetEntityId: grade11B.publicId, relationType: 'TEACHES_IN', metadata: { subject: 'Literature', periods_per_week: '5' } })
        // Sarah also teaches Grade 11-B for Physics
        if (sarah && grade11B) rels.push({ sourceEntityId: sarah.publicId, targetEntityId: grade11B.publicId, relationType: 'TEACHES_IN', metadata: { subject: 'Physics', periods_per_week: '4' } })

        // Student → ENROLLED_IN → GROUP
        if (alice) rels.push({ sourceEntityId: alice.publicId, targetEntityId: grade10A.publicId, relationType: 'ENROLLED_IN', metadata: { roll_no: '01' } })
        if (bob)   rels.push({ sourceEntityId: bob.publicId,   targetEntityId: grade10A.publicId, relationType: 'ENROLLED_IN', metadata: { roll_no: '02' } })

        // Parent → GUARDIAN_OF → Student
        rels.push({ sourceEntityId: parentEntity.publicId, targetEntityId: alice?.publicId ?? '', relationType: 'GUARDIAN_OF', metadata: { relation: 'Mother' } })

        for (const r of rels) {
          if (!r.targetEntityId) continue
          await db.entityRelation.create({ data: r })
        }
        console.log(`  ✅ Education graph: ${rels.length} relations wired`)
      }

      else if (tenant.industry === 'REAL_ESTATE') {
        const all = await db.businessEntity.findMany({ where: { deletedAt: null } })
        const find = (name: string) => all.find(e => e.name === name)
        const smith = find('Agent Smith')
        const jones = find('Agent Jones')
        const villa = find('Sunset Villa')
        const flat  = find('Metropolis Flat')
        const bruce = find('Bruce Wayne')

        const rels: any[] = []
        if (smith && villa)  rels.push({ sourceEntityId: smith.publicId, targetEntityId: villa.publicId,  relationType: 'MANAGES_PROPERTY', metadata: { since: '2024-01-01', commission_pct: '2.5' } })
        if (jones && flat)   rels.push({ sourceEntityId: jones.publicId, targetEntityId: flat.publicId,   relationType: 'MANAGES_PROPERTY', metadata: { since: '2024-06-01', commission_pct: '2.0' } })
        if (smith && bruce)  rels.push({ sourceEntityId: smith.publicId, targetEntityId: bruce.publicId,  relationType: 'ASSIGNED_LEAD',    metadata: { interest: 'Penthouse', budget: '15000000' } })

        for (const r of rels) await db.entityRelation.create({ data: r })
        console.log(`  ✅ Real Estate graph: ${rels.length} relations wired`)
      }

      else if (tenant.industry === 'HEALTHCARE') {
        const all = await db.businessEntity.findMany({ where: { deletedAt: null } })
        const find = (name: string) => all.find(e => e.name === name)
        const house   = find('Dr. Gregory House')
        const patient = find('Patient Zero')

        const rels: any[] = []
        if (house && patient) rels.push({ sourceEntityId: house.publicId, targetEntityId: patient.publicId, relationType: 'ATTENDING_PHYSICIAN_OF', metadata: { ward: 'Diagnostics', since: '2024-03-01' } })

        for (const r of rels) await db.entityRelation.create({ data: r })
        console.log(`  ✅ Healthcare graph: ${rels.length} relations wired`)
      }

      console.log('  ✅ Success!')

    } catch(err: any) {
       console.error(`  ❌ Failed seeding ${tenant.name}:`, err.message)
    }
  }

  console.log('\n✅ All tenants seeded with polymorphic CRM data and relation graph!')
}

main().catch(console.error).finally(() => process.exit(0))
