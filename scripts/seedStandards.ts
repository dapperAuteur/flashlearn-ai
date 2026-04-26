/**
 * Seed CurriculumStandard rows from JSON files in lib/data/standards/.
 *
 * Run: npx tsx scripts/seedStandards.ts
 *      or: npm run seed:standards (after adding the script to package.json)
 *
 * Idempotent — uses upsert keyed on (framework, code).
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { CurriculumStandard, type AgeBand } from '../models/CurriculumStandard';

interface StandardRow {
  code: string;
  title: string;
  description?: string;
  parentCode?: string;
}

interface StandardsFile {
  framework: string;
  ageBand?: AgeBand;
  source?: string;
  standards: StandardRow[];
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required to seed standards.');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const dir = join(process.cwd(), 'lib', 'data', 'standards');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));

  let totalUpserts = 0;
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf8');
    const data = JSON.parse(raw) as StandardsFile;
    console.log(`Seeding ${data.standards.length} standards from ${file} (framework=${data.framework})`);

    for (const row of data.standards) {
      await CurriculumStandard.updateOne(
        { framework: data.framework, code: row.code },
        {
          $set: {
            title: row.title,
            description: row.description,
            ageBand: data.ageBand,
            parentCode: row.parentCode,
            active: true,
          },
        },
        { upsert: true },
      );
      totalUpserts += 1;
    }
  }

  console.log(`Upserted ${totalUpserts} standards from ${files.length} file(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
