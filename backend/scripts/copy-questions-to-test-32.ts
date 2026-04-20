#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const DB_BINDING = 'DB';
const SOURCE_TEST_ID = 47;
const TARGET_TEST_ID = 32;

function execD1(command: string, useRemote = true): string | null {
  try {
    const remoteFlag = useRemote ? '--remote' : '';
    const tempFile = join(tmpdir(), `d1-query-${Date.now()}-${Math.random().toString(36).substring(7)}.sql`);

    writeFileSync(tempFile, command.trim(), 'utf-8');

    const result = execSync(`wrangler d1 execute ${DB_BINDING} ${remoteFlag} --file "${tempFile}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    try {
      unlinkSync(tempFile);
    } catch (e) {}

    return result;
  } catch (error: any) {
    console.error(`Error executing: ${command.substring(0, 100)}...`);
    console.error(error.message);
    return null;
  }
}

function parseJSONResult(result: string | null): any[] {
  if (!result) return [];
  try {
    // Try to find JSON array in the result
    const jsonMatch = result.match(/\[([\s\S]*)\]/);
    if (jsonMatch) {
      const jsonStr = '[' + jsonMatch[1] + ']';
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check if it's the new format (with results array)
        if (parsed[0].results && Array.isArray(parsed[0].results)) {
          return parsed[0].results;
        }
        // Or old format (direct array of objects)
        if (Array.isArray(parsed[0]) && typeof parsed[0] === 'object') {
          return parsed[0];
        }
      }
    }
  } catch (e: any) {
    console.error('Error parsing result:', e.message);
    console.error('Result preview:', result.substring(0, 500));
  }
  return [];
}

async function main(): Promise<void> {
  console.log('🔄 Bắt đầu copy questions từ test 47 sang test 32...\n');

  // Get sections mapping
  console.log('📋 Lấy danh sách sections...');
  const sourceSections = parseJSONResult(execD1(
    `SELECT id, name, order_index FROM exam_sections WHERE test_id = ${SOURCE_TEST_ID} ORDER BY order_index ASC`
  ));

  const targetSections = parseJSONResult(execD1(
    `SELECT id, name, order_index FROM exam_sections WHERE test_id = ${TARGET_TEST_ID} ORDER BY order_index ASC`
  ));

  if (sourceSections.length !== targetSections.length) {
    console.error('❌ Số lượng sections không khớp!');
    console.error(`   Source (test ${SOURCE_TEST_ID}): ${sourceSections.length} sections`);
    console.error(`   Target (test ${TARGET_TEST_ID}): ${targetSections.length} sections`);
    return;
  }

  console.log(`✅ Tìm thấy ${sourceSections.length} sections\n`);

  let totalCopied = 0;

  for (let i = 0; i < sourceSections.length; i++) {
    const sourceSection = sourceSections[i];
    const targetSection = targetSections[i];

    console.log(`📝 Xử lý section: ${sourceSection.name}...`);

    // Get questions from source section
    const questions = parseJSONResult(execD1(
      `SELECT * FROM exam_questions WHERE section_id = ${sourceSection.id} ORDER BY order_index ASC`
    ));

    if (questions.length === 0) {
      console.log(`   ⚠️  Không có questions trong section này\n`);
      continue;
    }

    console.log(`   📌 Tìm thấy ${questions.length} questions`);

    // Copy each question to target section
    for (const question of questions) {
      const escapeSQL = (str: any): string => {
        if (!str) return 'NULL';
        return `'${String(str).replace(/'/g, "''")}'`;
      };

      const sql = `INSERT INTO exam_questions (section_id, type, question_text, question_data, options_json, answer_key, points, difficulty, explanation, audio_url, image_url, order_index, version) VALUES (${targetSection.id}, ${escapeSQL(question.type)}, ${escapeSQL(question.question_text)}, ${escapeSQL(question.question_data)}, ${escapeSQL(question.options_json)}, ${escapeSQL(question.answer_key)}, ${question.points || 1}, ${escapeSQL(question.difficulty || 'medium')}, ${escapeSQL(question.explanation)}, ${escapeSQL(question.audio_url)}, ${escapeSQL(question.image_url)}, ${question.order_index}, ${question.version || 1})`;

      const result = execD1(sql);
      if (result) {
        totalCopied++;
        console.log(`   ✅ Đã copy: ${question.question_text.substring(0, 50)}...`);
      } else {
        console.error(`   ❌ Lỗi copy question: ${question.question_text.substring(0, 50)}...`);
      }
    }

    console.log('');
  }

  console.log('\n📊 Tổng kết:');
  console.log(`✅ Đã copy ${totalCopied} questions từ test ${SOURCE_TEST_ID} sang test ${TARGET_TEST_ID}`);
}

main().catch(console.error);
