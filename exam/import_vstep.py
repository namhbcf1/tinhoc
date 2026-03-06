"""
VSTEP PDF Parser and Exam Platform Importer
Extracts VSTEP test questions from PDF and imports to exam platform
"""

import PyPDF2
import re
import json
import requests
import sys
from pathlib import Path

# API Configuration
API_BASE = "https://vantrangedu-api.bangachieu2.workers.dev"
EXAM_API = f"{API_BASE}/exam-platform"

def parse_vstep_pdf(pdf_path):
    """Parse VSTEP PDF and extract test structure"""
    print(f"📖 Reading PDF: {pdf_path}")
    
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        total_pages = len(reader.pages)
        print(f"  ✓ Total pages: {total_pages}")
        
        # Extract all text
        full_text = ""
        for page_num in range(total_pages):
            page = reader.pages[page_num]
            full_text += page.extract_text() + "\n"
        
    print(f"  ✓ Extracted {len(full_text)} characters\n")
    
    # Detect tests (looking for "TEST 1", "TEST 2", etc.)
    tests = []
    test_pattern = r'TEST\s+(\d+)\s*[\-–—]\s*([^\n]+)'
    test_matches = list(re.finditer(test_pattern, full_text, re.IGNORECASE))
    
    print(f"🔍 Found {len(test_matches)} tests:")
    for match in test_matches:
        test_num = match.group(1)
        test_title = match.group(2).strip()
        print(f"  • Test {test_num}: {test_title}")
        tests.append({
            'number': test_num,
            'title': test_title,
            'start_pos': match.start()
        })
    
    return full_text, tests

def extract_test_content(full_text, test_info, next_test_pos=None):
    """Extract content for a single test"""
    start = test_info['start_pos']
    end = next_test_pos if next_test_pos else len(full_text)
    
    test_text = full_text[start:end]
    
    # Extract level (B1, B2, C1)
    level_match = re.search(r'\b([BC][12])\b', test_info['title'])
    level = level_match.group(1) if level_match else 'B2'
    
    # Extract sections (Listening, Reading, Writing, Speaking)
    sections = extract_sections(test_text)
    
    return {
        'test_num': test_info['number'],
        'title': f"VSTEP Test {test_info['number']} - {test_info['title']}",
        'level': level,
        'sections': sections
    }

def extract_sections(test_text):
    """Extract sections from test text"""
    sections = []
    
    # Common VSTEP sections
    section_patterns = [
        (r'LISTENING\s+TEST', 'Listening', 'listening'),
        (r'READING\s+TEST', 'Reading', 'reading'),
        (r'WRITING\s+TEST', 'Writing', 'writing'),
        (r'SPEAKING\s+TEST', 'Speaking', 'speaking')
    ]
    
    for pattern, name, code in section_patterns:
        match = re.search(pattern, test_text, re.IGNORECASE)
        if match:
            sections.append({
                'title': name,
                'code': code,
                'start_pos': match.start()
            })
    
    # Sort by position
    sections.sort(key=lambda x: x['start_pos'])
    
    # Extract questions for each section
    for i, section in enumerate(sections):
        start = section['start_pos']
        end = sections[i+1]['start_pos'] if i+1 < len(sections) else len(test_text)
        section_text = test_text[start:end]
        
        # Extract questions (looking for "Question 1", "1.", etc.)
        questions = extract_questions(section_text, section['code'])
        section['questions'] = questions
        section['order_num'] = i + 1
        del section['start_pos']  # Remove helper field
    
    return sections

def extract_questions(section_text, section_type):
    """Extract questions from section text"""
    questions = []
    
    # MCQ pattern (most common in VSTEP)
    question_pattern = r'(?:Question\s+)?(\d+)\.?\s+([^\n]+(?:\n(?!\d+\.)[^\n]+)*)'
    
    matches = re.finditer(question_pattern, section_text)
    for match in matches:
        q_num = match.group(1)
        q_text = match.group(2).strip()
        
        # Extract options (A, B, C, D)
        options = []
        option_pattern = r'([A-D])\.?\s+([^\n]+)'
        option_matches = re.finditer(option_pattern, q_text)
        
        for opt_match in option_matches:
            options.append({
                'label': opt_match.group(1),
                'text': opt_match.group(2).strip()
            })
        
        if options:  # Only add if we found options (MCQ)
            questions.append({
                'order_num': int(q_num),
                'question_text': q_text.split('\n')[0].strip(),  # First line as question
                'question_type': 'mcq',
                'points': 1,
                'options': options,
                'correct_answer': None  # Will need manual input or answer key parsing
            })
    
    return questions

def create_exam_json(test_data):
    """Create JSON for exam platform import"""
    return {
        'title': test_data['title'],
        'exam_type': 'VSTEP',
        'level': test_data['level'],
        'duration': 150,  # 2.5 hours typical for VSTEP
        'is_active': False,  # Set to draft first
        'instructions': f"This is VSTEP {test_data['level']} test. Complete all sections within the time limit.",
        'sections': [
            {
                'title': sec['title'],
                'order_num': sec['order_num'],
                'instructions': f"Complete all questions in the {sec['title']} section.",
                'questions': [
                    {
                        'order_num': q['order_num'],
                        'question_type': q['question_type'],
                        'question_text': q['question_text'],
                        'points': q['points'],
                        'config': {
                            'options': q['options']
                        } if q['question_type'] == 'mcq' else {}
                    }
                    for q in sec['questions']
                ]
            }
            for sec in test_data['sections']
        ]
    }

def import_to_platform(test_json, admin_token):
    """Import test to exam platform"""
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {admin_token}'
    }
    
    print(f"\n📤 Importing: {test_json['title']}")
    response = requests.post(
        f"{EXAM_API}/admin/import-test",
        headers=headers,
        json=test_json
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            print(f"  ✅ Success! Test ID: {result.get('data', {}).get('id')}")
            return True
        else:
            print(f"  ❌ Failed: {result.get('error')}")
            return False
    else:
        print(f"  ❌ HTTP Error {response.status_code}: {response.text[:200]}")
        return False

def main():
    pdf_path = r"c:\Users\ADMIN\Desktop\thongtin\exam\Bản sao của 7-Vstep-Tests-B1-B2-C1-Full-Key.pdf"
    
    # Get admin token from localStorage (you'll need to provide this)
    admin_token = input("Enter admin token (from localStorage.getItem('admin_token')): ").strip()
    
    if not admin_token:
        print("❌ Admin token required!")
        return
    
    # Parse PDF
    full_text, tests = parse_vstep_pdf(pdf_path)
    
    if not tests:
        print("❌ No tests found in PDF!")
        return
    
    # Process each test
    print(f"\n🔄 Processing {len(tests)} tests...\n")
    
    for i, test_info in enumerate(tests):
        next_pos = tests[i+1]['start_pos'] if i+1 < len(tests) else None
        test_data = extract_test_content(full_text, test_info, next_pos)
        
        print(f"\n{'='*60}")
        print(f"Test {test_data['test_num']}: {test_data['title']}")
        print(f"Level: {test_data['level']}")
        print(f"Sections: {len(test_data['sections'])}")
        for sec in test_data['sections']:
            print(f"  • {sec['title']}: {len(sec['questions'])} questions")
        
        # Save to JSON file
        json_path = f"vstep_test_{test_data['test_num']}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            exam_json = create_exam_json(test_data)
            json.dump(exam_json, f, indent=2, ensure_ascii=False)
        print(f"  ✓ Saved to {json_path}")
        
        # Ask before importing
        choice = input(f"\n  Import Test {test_data['test_num']} to platform? (y/n): ").strip().lower()
        if choice == 'y':
            exam_json = create_exam_json(test_data)
            import_to_platform(exam_json, admin_token)
    
    print(f"\n{'='*60}")
    print("✅ Processing complete!")

if __name__ == "__main__":
    main()
