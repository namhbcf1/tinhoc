#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(__filename);

const DB_BINDING = 'DB';

function execD1(command: string, useRemote = true): string | null {
  try {
    const remoteFlag = useRemote ? '--remote' : '';

    const escapedCommand = command.replace(/"/g, '\\"');
    const result = execSync(`wrangler d1 execute ${DB_BINDING} ${remoteFlag} --command "${escapedCommand}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    return result;
  } catch (error: any) {
    console.error(`Error executing: ${command.substring(0, 100)}...`);
    console.error(error.message);
    return null;
  }
}

function execD1File(filePath: string): string | null {
  try {
    const result = execSync(`wrangler d1 execute ${DB_BINDING} --file "${filePath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return result;
  } catch (error: any) {
    console.error(`Error executing file: ${filePath}`);
    console.error(error.message);
    return null;
  }
}

async function createExamTypeIfNotExists(code: string, name: string, description: string): Promise<number | null> {
  const existingId = await getExamTypeId(code);
  if (existingId) {
    return existingId;
  }
  
  const sql = `INSERT INTO exam_types (code, name, description) VALUES (${escapeSQL(code)}, ${escapeSQL(name)}, ${escapeSQL(description)});`;
  
  const result = execD1(sql);
  if (!result) {
    const id = await getExamTypeId(code);
    if (id) {
      return id;
    }
    return null;
  }

  const match = result.match(/last_row_id[":\s]*(\d+)/);
  if (match) {
    console.log(`  ✅ Đã tạo exam type: ${code} (ID: ${match[1]})`);
    return parseInt(match[1]);
  }
  
  const id = await getExamTypeId(code);
  if (id) {
    console.log(`  ✅ Exam type đã tồn tại: ${code} (ID: ${id})`);
  }
  return id;
}

async function getExamTypeId(code: string): Promise<number | null> {
  const result = execD1(`SELECT id FROM exam_types WHERE code = '${code}' LIMIT 1`);
  if (!result) return null;

  try {
    const jsonArrayMatch = result.match(/\[([\s\S]*)\]/);
    if (jsonArrayMatch) {
      const jsonStr = '[' + jsonArrayMatch[1] + ']';
      const parsed = JSON.parse(jsonStr);

      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) {
        const results = parsed[0].results;
        if (Array.isArray(results) && results.length > 0 && results[0].id !== undefined) {
          return parseInt(results[0].id);
        }
      }
    }

    const directMatch = result.match(/"id"\s*:\s*(\d+)/);
    if (directMatch) {
      return parseInt(directMatch[1]);
    }
  } catch (e: any) {
    console.error('Error parsing exam type ID:', e.message);
  }
  
  const lines = result.split('\n');
  for (const line of lines) {
    const match = line.match(/(\d+)\s*\|\s*(\d+)/);
    if (match) {
      return parseInt(match[2]);
    }
    const match2 = line.match(/id\s*\|\s*(\d+)/);
    if (match2) {
      return parseInt(match2[1]);
    }
  }
  
  return null;
}

async function getAdminUserId(): Promise<number> {
  let result = execD1(`SELECT id FROM admins LIMIT 1`);
  if (result) {
    try {
      const jsonArrayMatch = result.match(/\[([\s\S]*)\]/);
      if (jsonArrayMatch) {
        const jsonStr = '[' + jsonArrayMatch[1] + ']';
        const parsed = JSON.parse(jsonStr);

        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) {
          const results = parsed[0].results;
          if (Array.isArray(results) && results.length > 0 && results[0].id !== undefined) {
            return parseInt(results[0].id);
          }
        }
      }
    } catch (e) {}
    
    const jsonMatch = result.match(/"id":\s*(\d+)/);
    if (jsonMatch) {
      return parseInt(jsonMatch[1]);
    }
  }

  return 1;
}

function escapeSQL(str: any): string {
  if (!str) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function createExamTest(examTypeCode: string, testData: any): Promise<number | null> {
  let examTypeId = await getExamTypeId(examTypeCode);
  
  if (!examTypeId) {
    const examTypeNames = {
      'IC3': 'IC3 - Internet and Computing Core Certification',
      'JLPT': 'JLPT - Japanese Language Proficiency Test',
      'MOS': 'MOS - Microsoft Office Specialist',
      'TOPIK': 'TOPIK - Test of Proficiency in Korean',
      'VSTEP': 'VSTEP - Vietnamese Standardized Test of English Proficiency'
    };
    
    console.log(`📌 Tạo exam type: ${examTypeCode}...`);
    examTypeId = await createExamTypeIfNotExists(
      examTypeCode,
      examTypeNames[examTypeCode] || examTypeCode,
      `Bài thi ${examTypeNames[examTypeCode] || examTypeCode}`
    );
    
    if (!examTypeId) {
      console.log(`⚠️ Exam type ${examTypeCode} có thể đã tồn tại, thử lấy lại ID...`);
      examTypeId = await getExamTypeId(examTypeCode);
      if (examTypeId) {
        console.log(`✅ Đã tìm thấy exam type: ${examTypeCode} (ID: ${examTypeId})`);
      } else {
        console.error(`❌ Không thể tạo hoặc tìm exam type: ${examTypeCode}`);
        return null;
      }
    } else {
      console.log(`✅ Đã tạo exam type: ${examTypeCode} (ID: ${examTypeId})`);
    }
  }

  const adminId = await getAdminUserId();
  
  let sql = `INSERT INTO exam_tests (exam_type_id, level, title, description, duration_minutes, passing_score, shuffle_questions, shuffle_options, created_by`;
  
  const hasStatus = execD1(`PRAGMA table_info(exam_tests)`);
  if (hasStatus && hasStatus.includes('status')) {
    sql += `, status, reviewed_by, reviewed_at) VALUES (${examTypeId}, ${escapeSQL(testData.level)}, ${escapeSQL(testData.title)}, ${escapeSQL(testData.description)}, ${testData.duration}, ${testData.passing}, ${testData.shuffle_questions ? 1 : 0}, ${testData.shuffle_options ? 1 : 0}, ${adminId}, 'approved', ${adminId}, CURRENT_TIMESTAMP);`;
  } else {
    sql += `) VALUES (${examTypeId}, ${escapeSQL(testData.level)}, ${escapeSQL(testData.title)}, ${escapeSQL(testData.description)}, ${testData.duration}, ${testData.passing}, ${testData.shuffle_questions ? 1 : 0}, ${testData.shuffle_options ? 1 : 0}, ${adminId});`;
  }

  const result = execD1(sql);
  if (!result) {
    console.error(`  ❌ Không thể tạo bài thi: ${testData.title}`);
    return null;
  }

  try {
    const jsonMatch = result.match(/"last_row_id":\s*(\d+)/);
    if (jsonMatch) {
      return parseInt(jsonMatch[1]);
    }
  } catch (e) {}

  const match = result.match(/last_row_id[":\s]*(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }

  console.error(`  ❌ Không thể lấy ID bài thi. Kết quả:`, result.substring(0, 300));
  return null;
}

async function createSection(testId: number, sectionData: any): Promise<number | null> {
  const sql = `INSERT INTO exam_sections (test_id, name, description, order_index, time_limit_minutes, instructions, scoring_rule) VALUES (${testId}, ${escapeSQL(sectionData.name)}, ${escapeSQL(sectionData.description)}, ${sectionData.order_index}, ${sectionData.time_limit || 'NULL'}, ${escapeSQL(sectionData.instructions)}, ${escapeSQL(sectionData.scoring_rule)});`;

  const result = execD1(sql);
  if (!result) {
    console.error(`  ❌ Không thể tạo section: ${sectionData.name}`);
    return null;
  }

  try {
    const jsonMatch = result.match(/"last_row_id":\s*(\d+)/);
    if (jsonMatch) {
      return parseInt(jsonMatch[1]);
    }
  } catch (e) {}
  
  const match = result.match(/last_row_id[":\s]*(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  console.error(`  ❌ Không thể lấy ID bài thi. Kết quả:`, result.substring(0, 300));
  return null;
}

async function createQuestion(sectionId: number, questionData: any, orderIndex: number): Promise<boolean> {
  const optionsJson = questionData.options ? JSON.stringify(questionData.options) : null;
  const answerKey = questionData.answer_key ? (typeof questionData.answer_key === 'string' ? questionData.answer_key : JSON.stringify(questionData.answer_key)) : '';
  
  const sql = `INSERT INTO exam_questions (section_id, type, question_text, options_json, answer_key, points, order_index, explanation, question_data) VALUES (${sectionId}, ${escapeSQL(questionData.type)}, ${escapeSQL(questionData.text)}, ${optionsJson ? escapeSQL(optionsJson) : 'NULL'}, ${answerKey ? escapeSQL(answerKey) : "''"}, ${questionData.points || 1}, ${orderIndex}, ${questionData.explanation ? escapeSQL(questionData.explanation) : 'NULL'}, ${questionData.question_data ? escapeSQL(JSON.stringify(questionData.question_data)) : 'NULL'});`;

  const result = execD1(sql);
  return result !== null;
}

interface QuestionData {
  type: string;
  text: string;
  options?: string[];
  answer_key: string | string[];
  points?: number;
  explanation?: string;
  question_data?: any;
}

interface SectionData {
  name: string;
  description: string;
  order_index: number;
  time_limit?: number;
  instructions: string;
  scoring_rule: string;
  questions: QuestionData[];
}

interface TestData {
  level: string;
  title: string;
  description: string;
  duration: number;
  passing: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
}

interface ExamEntry {
  type: string;
  test: TestData;
  sections: SectionData[];
}

const examTests: ExamEntry[] = [
  // IC3 Tests
  {
    type: 'IC3',
    test: {
      level: 'Basic',
      title: 'IC3 - Computer Fundamentals Practice Test 1',
      description: 'Bài thi thực hành về kiến thức cơ bản máy tính, phần cứng, phần mềm và hệ điều hành',
      duration: 60,
      passing: 70,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Computer Basics',
        description: 'Kiến thức cơ bản về máy tính',
        order_index: 1,
        time_limit: 20,
        instructions: 'Chọn câu trả lời đúng nhất',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'CPU là viết tắt của?',
            options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Computer Processing Unit'],
            answer_key: 'Central Processing Unit',
            points: 1,
            explanation: 'CPU (Central Processing Unit) là bộ xử lý trung tâm của máy tính'
          },
          {
            type: 'mcq',
            text: 'RAM là bộ nhớ gì?',
            options: ['Chỉ đọc', 'Ngẫu nhiên', 'Chỉ ghi', 'Cố định'],
            answer_key: 'Ngẫu nhiên',
            points: 1,
            explanation: 'RAM (Random Access Memory) là bộ nhớ truy cập ngẫu nhiên'
          },
          {
            type: 'mcq',
            text: '1 GB bằng bao nhiêu MB?',
            options: ['100 MB', '512 MB', '1024 MB', '2048 MB'],
            answer_key: '1024 MB',
            points: 1,
            explanation: '1 GB = 1024 MB'
          }
        ]
      },
      {
        name: 'Operating Systems',
        description: 'Hệ điều hành',
        order_index: 2,
        time_limit: 20,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Hệ điều hành nào sau đây là mã nguồn mở?',
            options: ['Windows', 'macOS', 'Linux', 'iOS'],
            answer_key: 'Linux',
            points: 1,
            explanation: 'Linux là hệ điều hành mã nguồn mở'
          },
          {
            type: 'mcq',
            text: 'File system NTFS được sử dụng bởi?',
            options: ['Linux', 'Windows', 'macOS', 'Android'],
            answer_key: 'Windows',
            points: 1,
            explanation: 'NTFS là file system của Windows'
          }
        ]
      },
      {
        name: 'Software Applications',
        description: 'Ứng dụng phần mềm',
        order_index: 3,
        time_limit: 20,
        instructions: 'Trả lời các câu hỏi về phần mềm',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Phần mềm nào sau đây là trình duyệt web?',
            options: ['Word', 'Chrome', 'Excel', 'PowerPoint'],
            answer_key: 'Chrome',
            points: 1,
            explanation: 'Chrome là trình duyệt web'
          }
        ]
      }
    ]
  },
  {
    type: 'IC3',
    test: {
      level: 'Intermediate',
      title: 'IC3 - Key Applications Practice Test 1',
      description: 'Bài thi về các ứng dụng văn phòng: Word, Excel, PowerPoint',
      duration: 90,
      passing: 75,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Microsoft Word',
        description: 'Kiến thức về Microsoft Word',
        order_index: 1,
        time_limit: 30,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Phím tắt để lưu tài liệu trong Word là?',
            options: ['Ctrl+S', 'Ctrl+N', 'Ctrl+O', 'Ctrl+P'],
            answer_key: 'Ctrl+S',
            points: 1,
            explanation: 'Ctrl+S là phím tắt để lưu tài liệu'
          },
          {
            type: 'mcq',
            text: 'Để in đậm text trong Word, ta dùng?',
            options: ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+D'],
            answer_key: 'Ctrl+B',
            points: 1,
            explanation: 'Ctrl+B để in đậm (Bold)'
          }
        ]
      },
      {
        name: 'Microsoft Excel',
        description: 'Kiến thức về Microsoft Excel',
        order_index: 2,
        time_limit: 30,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Công thức nào để tính tổng trong Excel?',
            options: ['=SUM()', '=ADD()', '=TOTAL()', '=PLUS()'],
            answer_key: '=SUM()',
            points: 1,
            explanation: '=SUM() là hàm tính tổng trong Excel'
          },
          {
            type: 'mcq',
            text: 'Ô A1 có giá trị 10, ô B1 có giá trị 20. Công thức =A1+B1 sẽ cho kết quả?',
            options: ['10', '20', '30', 'Lỗi'],
            answer_key: '30',
            points: 1,
            explanation: '10 + 20 = 30'
          }
        ]
      },
      {
        name: 'Microsoft PowerPoint',
        description: 'Kiến thức về Microsoft PowerPoint',
        order_index: 3,
        time_limit: 30,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Phím tắt để bắt đầu trình chiếu trong PowerPoint?',
            options: ['F5', 'F1', 'F2', 'F3'],
            answer_key: 'F5',
            points: 1,
            explanation: 'F5 để bắt đầu trình chiếu từ đầu'
          }
        ]
      }
    ]
  },
  {
    type: 'IC3',
    test: {
      level: 'Advanced',
      title: 'IC3 - Living Online Practice Test 1',
      description: 'Bài thi về Internet, email, và các công cụ trực tuyến',
      duration: 75,
      passing: 80,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Internet Basics',
        description: 'Kiến thức cơ bản về Internet',
        order_index: 1,
        time_limit: 25,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'HTTP là viết tắt của?',
            options: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'Hyper Transfer Text Protocol', 'High Text Transfer Protocol'],
            answer_key: 'HyperText Transfer Protocol',
            points: 1,
            explanation: 'HTTP = HyperText Transfer Protocol'
          },
          {
            type: 'mcq',
            text: 'URL là viết tắt của?',
            options: ['Uniform Resource Locator', 'Universal Resource Locator', 'Uniform Resource Link', 'Universal Resource Link'],
            answer_key: 'Uniform Resource Locator',
            points: 1,
            explanation: 'URL = Uniform Resource Locator'
          }
        ]
      },
      {
        name: 'Email',
        description: 'Kiến thức về Email',
        order_index: 2,
        time_limit: 25,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'CC trong email có nghĩa là?',
            options: ['Carbon Copy', 'Copy Content', 'Carbon Content', 'Copy Copy'],
            answer_key: 'Carbon Copy',
            points: 1,
            explanation: 'CC = Carbon Copy (gửi bản sao)'
          }
        ]
      },
      {
        name: 'Online Security',
        description: 'Bảo mật trực tuyến',
        order_index: 3,
        time_limit: 25,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'HTTPS khác HTTP ở điểm nào?',
            options: ['Nhanh hơn', 'Bảo mật hơn', 'Rẻ hơn', 'Dễ sử dụng hơn'],
            answer_key: 'Bảo mật hơn',
            points: 1,
            explanation: 'HTTPS có mã hóa SSL/TLS nên bảo mật hơn HTTP'
          }
        ]
      }
    ]
  },
  {
    type: 'IC3',
    test: {
      level: 'Basic',
      title: 'IC3 - Computer Essentials Practice Test 1',
      description: 'Bài thi tổng hợp về cơ bản máy tính và hệ điều hành',
      duration: 60,
      passing: 70,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Hardware Components',
        description: 'Thành phần phần cứng',
        order_index: 1,
        time_limit: 20,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Thiết bị nào sau đây là thiết bị đầu vào?',
            options: ['Monitor', 'Printer', 'Keyboard', 'Speaker'],
            answer_key: 'Keyboard',
            points: 1,
            explanation: 'Keyboard là thiết bị đầu vào'
          }
        ]
      }
    ]
  },
  {
    type: 'IC3',
    test: {
      level: 'Intermediate',
      title: 'IC3 - Digital Literacy Practice Test 1',
      description: 'Bài thi về kỹ năng số và công nghệ thông tin',
      duration: 90,
      passing: 75,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Digital Skills',
        description: 'Kỹ năng số',
        order_index: 1,
        time_limit: 30,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Cloud computing là gì?',
            options: ['Lưu trữ trên đám mây', 'Tính toán trên đám mây', 'Cả hai', 'Không có đáp án đúng'],
            answer_key: 'Cả hai',
            points: 1,
            explanation: 'Cloud computing bao gồm cả lưu trữ và tính toán trên đám mây'
          }
        ]
      }
    ]
  },
  // JLPT Tests
  {
    type: 'JLPT',
    test: {
      level: 'N5',
      title: 'JLPT - N5 Level Practice Test 1',
      description: 'Bài thi thử JLPT N5 - Trình độ sơ cấp tiếng Nhật',
      duration: 105,
      passing: 60,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Vocabulary',
        description: 'Từ vựng',
        order_index: 1,
        time_limit: 25,
        instructions: 'Chọn từ đúng nhất',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: '「こんにちは」có nghĩa là gì?',
            options: ['Xin chào (buổi sáng)', 'Xin chào (buổi trưa/chiều)', 'Xin chào (buổi tối)', 'Tạm biệt'],
            answer_key: 'Xin chào (buổi trưa/chiều)',
            points: 1,
            explanation: '「こんにちは」là cách chào hỏi vào buổi trưa và chiều'
          },
          {
            type: 'mcq',
            text: '「ありがとう」có nghĩa là gì?',
            options: ['Xin lỗi', 'Cảm ơn', 'Không có gì', 'Xin chào'],
            answer_key: 'Cảm ơn',
            points: 1,
            explanation: '「ありがとう」có nghĩa là "Cảm ơn"'
          },
          {
            type: 'mcq',
            text: 'Số 1 trong tiếng Nhật là?',
            options: ['いち', 'に', 'さん', 'よん'],
            answer_key: 'いち',
            points: 1,
            explanation: 'いち (ichi) là số 1 trong tiếng Nhật'
          }
        ]
      },
      {
        name: 'Grammar',
        description: 'Ngữ pháp',
        order_index: 2,
        time_limit: 30,
        instructions: 'Chọn câu đúng ngữ pháp',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Chọn câu đúng:',
            options: ['わたしは がくせい です。', 'わたしは がくせい だ。', 'わたしは がくせい である。', 'わたしは がくせい だです。'],
            answer_key: 'わたしは がくせい です。',
            points: 1,
            explanation: 'です là cách lịch sự để kết thúc câu khẳng định'
          },
          {
            type: 'mcq',
            text: '「これは なん ですか」có nghĩa là?',
            options: ['Đây là cái gì?', 'Đây là ai?', 'Đây là ở đâu?', 'Đây là khi nào?'],
            answer_key: 'Đây là cái gì?',
            points: 1,
            explanation: 'なん (nan) có nghĩa là "cái gì"'
          }
        ]
      },
      {
        name: 'Reading',
        description: 'Đọc hiểu',
        order_index: 3,
        time_limit: 25,
        instructions: 'Đọc và trả lời câu hỏi',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: '「きょうは げつようび です」có nghĩa là?',
            options: ['Hôm nay là thứ Hai', 'Hôm nay là thứ Ba', 'Hôm nay là thứ Tư', 'Hôm nay là thứ Năm'],
            answer_key: 'Hôm nay là thứ Hai',
            points: 1,
            explanation: 'げつようび (getsuyoubi) là thứ Hai'
          }
        ]
      },
      {
        name: 'Listening',
        description: 'Nghe hiểu',
        order_index: 4,
        time_limit: 25,
        instructions: 'Nghe và chọn đáp án đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Trong JLPT N5, phần nghe thường có bao nhiêu phần?',
            options: ['2 phần', '3 phần', '4 phần', '5 phần'],
            answer_key: '4 phần',
            points: 1,
            explanation: 'JLPT N5 có 4 phần nghe: hiểu điểm chính, hiểu điểm quan trọng, hiểu ngữ cảnh, và trả lời nhanh'
          }
        ]
      }
    ]
  },
  {
    type: 'JLPT',
    test: {
      level: 'N4',
      title: 'JLPT - N4 Level Practice Test 1',
      description: 'Bài thi thử JLPT N4 - Trình độ sơ trung cấp tiếng Nhật',
      duration: 125,
      passing: 65,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Vocabulary & Kanji',
        description: 'Từ vựng và Kanji',
        order_index: 1,
        time_limit: 30,
        instructions: 'Chọn từ đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Kanji 「学校」đọc là?',
            options: ['がっこう', 'がくこう', 'がっこ', 'がくこ'],
            answer_key: 'がっこう',
            points: 1,
            explanation: '学校 (gakkou) có nghĩa là "trường học"'
          },
          {
            type: 'mcq',
            text: '「勉強」có nghĩa là?',
            options: ['Học tập', 'Làm việc', 'Nghỉ ngơi', 'Vui chơi'],
            answer_key: 'Học tập',
            points: 1,
            explanation: '勉強 (benkyou) có nghĩa là "học tập"'
          }
        ]
      },
      {
        name: 'Grammar',
        description: 'Ngữ pháp',
        order_index: 2,
        time_limit: 35,
        instructions: 'Chọn câu đúng ngữ pháp',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Chọn câu đúng với 「て形」:',
            options: ['たべる → たべて', 'たべる → たべた', 'たべる → たべるて', 'たべる → たべりて'],
            answer_key: 'たべる → たべて',
            points: 1,
            explanation: 'Động từ nhóm 2 (ru-verbs): bỏ る thêm て'
          }
        ]
      }
    ]
  },
  {
    type: 'JLPT',
    test: {
      level: 'N3',
      title: 'JLPT - N3 Level Practice Test 1',
      description: 'Bài thi thử JLPT N3 - Trình độ trung cấp tiếng Nhật',
      duration: 140,
      passing: 70,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Language Knowledge',
        description: 'Kiến thức ngôn ngữ',
        order_index: 1,
        time_limit: 30,
        instructions: 'Chọn đáp án đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: '「〜てしまう」có nghĩa là?',
            options: ['Làm xong việc gì đó', 'Làm nhầm/lỡ làm gì đó', 'Bắt đầu làm gì đó', 'Tiếp tục làm gì đó'],
            answer_key: 'Làm nhầm/lỡ làm gì đó',
            points: 1,
            explanation: '〜てしまう thường diễn tả hành động làm nhầm hoặc lỡ làm gì đó'
          }
        ]
      }
    ]
  },
  // MOS Tests
  {
    type: 'MOS',
    test: {
      level: 'Expert',
      title: 'MOS - Word Expert Practice Test 1',
      description: 'Bài thi thử MOS Word Expert - Microsoft Word chuyên sâu',
      duration: 50,
      passing: 70,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Document Formatting',
        description: 'Định dạng tài liệu',
        order_index: 1,
        time_limit: 15,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Để tạo Style trong Word, ta vào tab nào?',
            options: ['Home', 'Insert', 'Design', 'References'],
            answer_key: 'Home',
            points: 1,
            explanation: 'Styles nằm trong tab Home'
          },
          {
            type: 'mcq',
            text: 'Phím tắt để tạo Header/Footer là?',
            options: ['Alt+H', 'Alt+N', 'Alt+J', 'Alt+M'],
            answer_key: 'Alt+N',
            points: 1,
            explanation: 'Alt+N để mở tab Insert, sau đó chọn Header/Footer'
          }
        ]
      },
      {
        name: 'Advanced Features',
        description: 'Tính năng nâng cao',
        order_index: 2,
        time_limit: 20,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Mail Merge trong Word dùng để?',
            options: ['Gửi email', 'Tạo tài liệu hàng loạt', 'Merge cells', 'Gộp tài liệu'],
            answer_key: 'Tạo tài liệu hàng loạt',
            points: 1,
            explanation: 'Mail Merge dùng để tạo nhiều tài liệu từ một template và danh sách dữ liệu'
          },
          {
            type: 'mcq',
            text: 'Macro trong Word là gì?',
            options: ['Một loại font chữ', 'Tập lệnh tự động', 'Một style', 'Một template'],
            answer_key: 'Tập lệnh tự động',
            points: 1,
            explanation: 'Macro là tập hợp các lệnh được ghi lại để tự động hóa các tác vụ lặp lại'
          }
        ]
      },
      {
        name: 'Collaboration',
        description: 'Làm việc nhóm',
        order_index: 3,
        time_limit: 15,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Track Changes trong Word dùng để?',
            options: ['Theo dõi thay đổi', 'Thay đổi track', 'Xóa thay đổi', 'Ẩn thay đổi'],
            answer_key: 'Theo dõi thay đổi',
            points: 1,
            explanation: 'Track Changes cho phép theo dõi và xem lại mọi thay đổi trong tài liệu'
          }
        ]
      }
    ]
  },
  {
    type: 'MOS',
    test: {
      level: 'Expert',
      title: 'MOS - Excel Expert Practice Test 1',
      description: 'Bài thi thử MOS Excel Expert - Microsoft Excel chuyên sâu',
      duration: 50,
      passing: 70,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Advanced Formulas',
        description: 'Công thức nâng cao',
        order_index: 1,
        time_limit: 20,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Hàm VLOOKUP dùng để?',
            options: ['Tìm kiếm dọc', 'Tìm kiếm ngang', 'Tính tổng', 'Đếm số'],
            answer_key: 'Tìm kiếm dọc',
            points: 1,
            explanation: 'VLOOKUP (Vertical Lookup) tìm kiếm giá trị theo cột dọc'
          },
          {
            type: 'mcq',
            text: 'Hàm INDEX và MATCH thường dùng để thay thế?',
            options: ['SUM', 'VLOOKUP', 'COUNT', 'AVERAGE'],
            answer_key: 'VLOOKUP',
            points: 1,
            explanation: 'INDEX + MATCH linh hoạt hơn VLOOKUP và có thể tìm kiếm cả dọc và ngang'
          },
          {
            type: 'mcq',
            text: 'Hàm IFERROR dùng để?',
            options: ['Kiểm tra lỗi', 'Xử lý lỗi', 'Tạo lỗi', 'Ẩn lỗi'],
            answer_key: 'Xử lý lỗi',
            points: 1,
            explanation: 'IFERROR trả về giá trị tùy chỉnh nếu công thức có lỗi'
          }
        ]
      },
      {
        name: 'Data Analysis',
        description: 'Phân tích dữ liệu',
        order_index: 2,
        time_limit: 15,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'PivotTable dùng để?',
            options: ['Tạo bảng', 'Phân tích dữ liệu', 'Vẽ biểu đồ', 'Tính toán'],
            answer_key: 'Phân tích dữ liệu',
            points: 1,
            explanation: 'PivotTable dùng để tổng hợp và phân tích dữ liệu lớn'
          },
          {
            type: 'mcq',
            text: 'Data Validation trong Excel dùng để?',
            options: ['Xác thực dữ liệu', 'Xóa dữ liệu', 'Sao chép dữ liệu', 'Di chuyển dữ liệu'],
            answer_key: 'Xác thực dữ liệu',
            points: 1,
            explanation: 'Data Validation giới hạn loại dữ liệu có thể nhập vào ô'
          }
        ]
      },
      {
        name: 'Charts and Visualization',
        description: 'Biểu đồ và trực quan hóa',
        order_index: 3,
        time_limit: 15,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Sparklines là gì?',
            options: ['Biểu đồ nhỏ trong ô', 'Biểu đồ lớn', 'Bảng tính', 'Công thức'],
            answer_key: 'Biểu đồ nhỏ trong ô',
            points: 1,
            explanation: 'Sparklines là biểu đồ mini nằm trong một ô để hiển thị xu hướng dữ liệu'
          }
        ]
      }
    ]
  },
  {
    type: 'MOS',
    test: {
      level: 'Associate',
      title: 'MOS - PowerPoint Associate Practice Test 1',
      description: 'Bài thi thử MOS PowerPoint Associate - Microsoft PowerPoint cơ bản',
      duration: 50,
      passing: 70,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Presentation Creation',
        description: 'Tạo bài thuyết trình',
        order_index: 1,
        time_limit: 20,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Slide Master dùng để?',
            options: ['Tạo slide mới', 'Định dạng template cho tất cả slides', 'Xóa slide', 'Sao chép slide'],
            answer_key: 'Định dạng template cho tất cả slides',
            points: 1,
            explanation: 'Slide Master cho phép định dạng một lần và áp dụng cho tất cả slides'
          },
          {
            type: 'mcq',
            text: 'Phím tắt để chèn slide mới?',
            options: ['Ctrl+M', 'Ctrl+N', 'Ctrl+O', 'Ctrl+P'],
            answer_key: 'Ctrl+M',
            points: 1,
            explanation: 'Ctrl+M để chèn slide mới'
          }
        ]
      },
      {
        name: 'Animations and Transitions',
        description: 'Hiệu ứng và chuyển tiếp',
        order_index: 2,
        time_limit: 15,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Transition khác Animation ở điểm nào?',
            options: ['Transition: giữa các slide, Animation: trong slide', 'Transition: trong slide, Animation: giữa các slide', 'Giống nhau', 'Không có sự khác biệt'],
            answer_key: 'Transition: giữa các slide, Animation: trong slide',
            points: 1,
            explanation: 'Transition là hiệu ứng chuyển giữa các slide, Animation là hiệu ứng cho đối tượng trong slide'
          }
        ]
      },
      {
        name: 'Media and Objects',
        description: 'Phương tiện và đối tượng',
        order_index: 3,
        time_limit: 15,
        instructions: 'Chọn câu trả lời đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Để chèn video vào slide, ta vào tab nào?',
            options: ['Home', 'Insert', 'Design', 'Animations'],
            answer_key: 'Insert',
            points: 1,
            explanation: 'Tab Insert có nút Video để chèn video vào slide'
          }
        ]
      }
    ]
  },
  // TOPIK Tests
  {
    type: 'TOPIK',
    test: {
      level: 'Level 1',
      title: 'TOPIK - Level 1 Practice Test 1',
      description: 'Bài thi thử TOPIK Level 1 - Trình độ sơ cấp tiếng Hàn',
      duration: 100,
      passing: 60,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Vocabulary',
        description: 'Từ vựng',
        order_index: 1,
        time_limit: 30,
        instructions: 'Chọn từ đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: '「안녕하세요」có nghĩa là gì?',
            options: ['Xin chào', 'Tạm biệt', 'Cảm ơn', 'Xin lỗi'],
            answer_key: 'Xin chào',
            points: 1,
            explanation: '안녕하세요 là cách chào hỏi lịch sự trong tiếng Hàn'
          },
          {
            type: 'mcq',
            text: '「감사합니다」có nghĩa là?',
            options: ['Xin lỗi', 'Cảm ơn', 'Xin chào', 'Tạm biệt'],
            answer_key: 'Cảm ơn',
            points: 1,
            explanation: '감사합니다 có nghĩa là "Cảm ơn"'
          },
          {
            type: 'mcq',
            text: 'Số 1 trong tiếng Hàn là?',
            options: ['일', '이', '삼', '사'],
            answer_key: '일',
            points: 1,
            explanation: '일 (il) là số 1 trong tiếng Hàn'
          }
        ]
      },
      {
        name: 'Grammar',
        description: 'Ngữ pháp',
        order_index: 2,
        time_limit: 35,
        instructions: 'Chọn câu đúng ngữ pháp',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'Chọn câu đúng:',
            options: ['저는 학생입니다.', '저는 학생입니다다.', '저는 학생입니다요.', '저는 학생입니다어요.'],
            answer_key: '저는 학생입니다.',
            points: 1,
            explanation: '입니다 là đuôi kết thúc câu lịch sự, không cần thêm gì'
          },
          {
            type: 'mcq',
            text: '「이것은 무엇입니까?」có nghĩa là?',
            options: ['Đây là cái gì?', 'Đây là ai?', 'Đây là ở đâu?', 'Đây là khi nào?'],
            answer_key: 'Đây là cái gì?',
            points: 1,
            explanation: '무엇 (mueot) có nghĩa là "cái gì"'
          }
        ]
      },
      {
        name: 'Reading',
        description: 'Đọc hiểu',
        order_index: 3,
        time_limit: 35,
        instructions: 'Đọc và trả lời câu hỏi',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: '「오늘은 월요일입니다」có nghĩa là?',
            options: ['Hôm nay là thứ Hai', 'Hôm nay là thứ Ba', 'Hôm nay là thứ Tư', 'Hôm nay là thứ Năm'],
            answer_key: 'Hôm nay là thứ Hai',
            points: 1,
            explanation: '월요일 (wolyoil) là thứ Hai'
          }
        ]
      }
    ]
  },
  {
    type: 'TOPIK',
    test: {
      level: 'Level 2',
      title: 'TOPIK - Level 2 Practice Test 1',
      description: 'Bài thi thử TOPIK Level 2 - Trình độ sơ trung cấp tiếng Hàn',
      duration: 100,
      passing: 65,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Vocabulary & Grammar',
        description: 'Từ vựng và ngữ pháp',
        order_index: 1,
        time_limit: 40,
        instructions: 'Chọn đáp án đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: '「~고 싶다」có nghĩa là?',
            options: ['Muốn làm gì', 'Đang làm gì', 'Đã làm gì', 'Sẽ làm gì'],
            answer_key: 'Muốn làm gì',
            points: 1,
            explanation: '~고 싶다 diễn tả mong muốn, "muốn làm gì"'
          }
        ]
      },
      {
        name: 'Reading',
        description: 'Đọc hiểu',
        order_index: 2,
        time_limit: 60,
        instructions: 'Đọc và trả lời câu hỏi',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'TOPIK Level 2 yêu cầu bao nhiêu từ vựng?',
            options: ['Khoảng 1,500 từ', 'Khoảng 2,000 từ', 'Khoảng 3,000 từ', 'Khoảng 4,000 từ'],
            answer_key: 'Khoảng 1,500 từ',
            points: 1,
            explanation: 'TOPIK Level 2 yêu cầu khoảng 1,500 từ vựng'
          }
        ]
      }
    ]
  },
  // VSTEP Tests
  {
    type: 'VSTEP',
    test: {
      level: 'B2',
      title: 'VSTEP - B2 Level Practice Test 1',
      description: 'Bài thi thử VSTEP B2 - Đánh giá năng lực tiếng Anh trình độ B2',
      duration: 120,
      passing: 60,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Listening',
        description: 'Phần nghe hiểu',
        order_index: 1,
        time_limit: 40,
        instructions: 'Bạn sẽ nghe các đoạn hội thoại và trả lời câu hỏi. Mỗi đoạn sẽ được phát 2 lần.',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'What is the main topic of the conversation?',
            options: ['Planning a vacation', 'Discussing work schedule', 'Making dinner plans', 'Shopping for groceries'],
            answer_key: 'Planning a vacation',
            points: 1,
            explanation: 'The conversation focuses on planning a vacation trip.'
          },
          {
            type: 'mcq',
            text: 'Where does the man want to go?',
            options: ['Beach', 'Mountains', 'City', 'Countryside'],
            answer_key: 'Mountains',
            points: 1,
            explanation: 'The man mentions wanting to go to the mountains for hiking.'
          },
          {
            type: 'mcq',
            text: 'When are they planning to leave?',
            options: ['Next week', 'Next month', 'In two weeks', 'Tomorrow'],
            answer_key: 'Next week',
            points: 1,
            explanation: 'They plan to leave next week according to the conversation.'
          }
        ]
      },
      {
        name: 'Reading',
        description: 'Phần đọc hiểu',
        order_index: 2,
        time_limit: 60,
        instructions: 'Đọc các đoạn văn và trả lời câu hỏi.',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'What is the main idea of the passage?',
            options: ['The history of technology', 'The impact of social media', 'Environmental protection', 'Educational reforms'],
            answer_key: 'The impact of social media',
            points: 1,
            explanation: 'The passage discusses how social media has changed communication.'
          },
          {
            type: 'mcq',
            text: 'According to the passage, what is one negative effect of social media?',
            options: ['Increased connectivity', 'Privacy concerns', 'Better education', 'Faster communication'],
            answer_key: 'Privacy concerns',
            points: 1,
            explanation: 'The passage mentions privacy concerns as a negative effect.'
          },
          {
            type: 'mcq',
            text: 'The author suggests that social media has:',
            options: ['Only positive effects', 'Only negative effects', 'Both positive and negative effects', 'No significant effects'],
            answer_key: 'Both positive and negative effects',
            points: 1,
            explanation: 'The passage presents a balanced view of both positive and negative effects.'
          }
        ]
      },
      {
        name: 'Writing',
        description: 'Phần viết',
        order_index: 3,
        time_limit: 40,
        instructions: 'Viết một bài luận về chủ đề được đưa ra. Tối thiểu 150 từ.',
        scoring_rule: '20 điểm',
        questions: [
          {
            type: 'essay',
            text: 'Write an essay discussing the advantages and disadvantages of online learning. Minimum 150 words.',
            answer_key: '',
            points: 20,
            explanation: 'Essay will be graded based on content, organization, vocabulary, and grammar.'
          }
        ]
      },
      {
        name: 'Speaking',
        description: 'Phần nói',
        order_index: 4,
        time_limit: 12,
        instructions: 'Trả lời các câu hỏi và thảo luận về chủ đề được đưa ra.',
        scoring_rule: '20 điểm',
        questions: [
          {
            type: 'essay',
            text: 'Describe your favorite hobby and explain why you enjoy it. Speak for at least 2 minutes.',
            answer_key: '',
            points: 20,
            explanation: 'Speaking will be graded based on fluency, pronunciation, vocabulary, and grammar.'
          }
        ]
      }
    ]
  },
  {
    type: 'VSTEP',
    test: {
      level: 'B1',
      title: 'VSTEP - B1 Level Practice Test 1',
      description: 'Bài thi thử VSTEP B1 - Đánh giá năng lực tiếng Anh trình độ B1',
      duration: 120,
      passing: 55,
      shuffle_questions: true,
      shuffle_options: true
    },
    sections: [
      {
        name: 'Listening',
        description: 'Phần nghe hiểu',
        order_index: 1,
        time_limit: 35,
        instructions: 'Nghe và chọn đáp án đúng',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'What time does the store close?',
            options: ['6 PM', '7 PM', '8 PM', '9 PM'],
            answer_key: '8 PM',
            points: 1,
            explanation: 'The store closes at 8 PM according to the announcement.'
          }
        ]
      },
      {
        name: 'Reading',
        description: 'Phần đọc hiểu',
        order_index: 2,
        time_limit: 55,
        instructions: 'Đọc và trả lời câu hỏi',
        scoring_rule: '1 điểm mỗi câu',
        questions: [
          {
            type: 'mcq',
            text: 'What is the purpose of the text?',
            options: ['To inform', 'To persuade', 'To entertain', 'To complain'],
            answer_key: 'To inform',
            points: 1,
            explanation: 'The text provides information about a topic.'
          }
        ]
      },
      {
        name: 'Writing',
        description: 'Phần viết',
        order_index: 3,
        time_limit: 30,
        instructions: 'Viết một đoạn văn ngắn. Tối thiểu 120 từ.',
        scoring_rule: '15 điểm',
        questions: [
          {
            type: 'essay',
            text: 'Write a paragraph describing your daily routine. Minimum 120 words.',
            answer_key: '',
            points: 15,
            explanation: 'Writing will be graded based on content, organization, vocabulary, and grammar.'
          }
        ]
      }
    ]
  }
];

async function main(): Promise<void> {
  console.log('🚀 Bắt đầu thêm bài thi vào D1 database...\n');

  let successCount = 0;
  let failCount = 0;

  for (const examData of examTests) {
    try {
      console.log(`📝 Đang tạo bài thi: ${examData.test.title}...`);
      
      const testId = await createExamTest(examData.type, examData.test);
      if (!testId) {
        console.error(`❌ Không thể tạo bài thi: ${examData.test.title}`);
        failCount++;
        continue;
      }

      console.log(`✅ Đã tạo bài thi với ID: ${testId}`);

      for (const sectionData of examData.sections) {
        const sectionId = await createSection(testId, sectionData);
        if (!sectionId) {
          console.error(`❌ Không thể tạo section: ${sectionData.name}`);
          continue;
        }

        console.log(`  ✅ Đã tạo section: ${sectionData.name} (ID: ${sectionId})`);

        for (let i = 0; i < sectionData.questions.length; i++) {
          const question = sectionData.questions[i];
          const success = await createQuestion(sectionId, question, i + 1);
          if (success) {
            console.log(`    ✅ Câu hỏi ${i + 1}: ${question.text.substring(0, 50)}...`);
          } else {
            console.error(`    ❌ Không thể tạo câu hỏi ${i + 1}`);
          }
        }
      }

      successCount++;
      console.log(`\n✅ Hoàn thành bài thi: ${examData.test.title}\n`);
    } catch (error) {
      console.error(`❌ Lỗi khi tạo bài thi ${examData.test.title}:`, error.message);
      failCount++;
    }
  }

  console.log('\n📊 Tổng kết:');
  console.log(`✅ Thành công: ${successCount} bài thi`);
  console.log(`❌ Thất bại: ${failCount} bài thi`);
}

main().catch(console.error);
