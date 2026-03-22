// Script to seed exam types into database
// Run with: npx wrangler d1 execute DB_NAME --remote --command="..."

interface ExamType {
  code: string;
  name: string;
  description: string;
  language: string | null;
  icon_url: string | null;
}

const examTypes: ExamType[] = [
  {
    code: 'vstep',
    name: 'VSTEP',
    description: 'Vietnamese Standardized Test of English Proficiency',
    language: 'English',
    icon_url: null
  },
  {
    code: 'topik',
    name: 'TOPIK',
    description: 'Test of Proficiency in Korean',
    language: 'Korean',
    icon_url: null
  },
  {
    code: 'jlpt',
    name: 'JLPT',
    description: 'Japanese Language Proficiency Test',
    language: 'Japanese',
    icon_url: null
  },
  {
    code: 'mos',
    name: 'MOS',
    description: 'Microsoft Office Specialist',
    language: null,
    icon_url: null
  },
  {
    code: 'ic3',
    name: 'IC3',
    description: 'Internet and Computing Core Certification',
    language: null,
    icon_url: null
  }
];

const sqlStatements: string = examTypes.map((type: ExamType) => {
  return `INSERT OR IGNORE INTO exam_types (code, name, description, language, icon_url)
VALUES ('${type.code}', '${type.name}', '${type.description}', ${type.language ? `'${type.language}'` : 'NULL'}, ${type.icon_url ? `'${type.icon_url}'` : 'NULL'});`;
}).join('\n');

console.log('SQL statements to seed exam types:');
console.log('\n' + sqlStatements);

// Alternative: Direct SQL file
const sqlFile: string = `-- Seed Exam Types
${sqlStatements}
`;

console.log('\n---\nOr save to file:');
console.log(sqlFile);
