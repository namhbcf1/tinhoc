"""
VSTEP Import Script - Non-Interactive Version
Creates 7 VSTEP tests (B1, B2, C1) directly in exam platform
"""

import PyPDF2
import re
import json
import requests
import os

# API Configuration
API_BASE = "https://vantrangedu-api.bangachieu2.workers.dev"
EXAM_API = f"{API_BASE}/exam-platform"

# Admin token - Get from browser console: localStorage.getItem('admin_token')
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', '')

def get_headers():
    return {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ADMIN_TOKEN}'
    }

def delete_all_tests():
    """Delete all existing exam tests"""
    print("\n🗑️ Deleting all existing tests...")
    try:
        response = requests.get(f"{EXAM_API}/tests", headers=get_headers())
        if response.status_code == 200:
            result = response.json()
            tests = result.get('data', []) if result.get('success') else []
            for test in tests:
                test_id = test.get('id')
                if test_id:
                    del_resp = requests.delete(
                        f"{EXAM_API}/admin/tests/{test_id}",
                        headers=get_headers()
                    )
                    if del_resp.status_code == 200:
                        print(f"  ✅ Deleted test ID: {test_id}")
                    else:
                        print(f"  ❌ Failed to delete test {test_id}: {del_resp.text[:100]}")
            print(f"  ✓ Deleted {len(tests)} tests")
        else:
            print(f"  ⚠️ Could not fetch tests: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Error: {e}")

def create_vstep_test(test_num, level):
    """Create a single VSTEP test with proper structure"""
    test_data = {
        "title": f"VSTEP Test {test_num} - {level}",
        "exam_type": "VSTEP",
        "level": level,
        "duration": 150,
        "is_active": True,
        "instructions": f"Đây là bài thi VSTEP {level}. Bài thi gồm 4 phần: Listening, Reading, Writing, Speaking. Thời gian: 150 phút.",
        "sections": [
            {
                "title": "Listening",
                "order_num": 1,
                "duration": 45,
                "instructions": "Nghe và trả lời các câu hỏi. Bạn sẽ được nghe mỗi đoạn 2 lần.",
                "questions": create_section_questions("listening", test_num)
            },
            {
                "title": "Reading",
                "order_num": 2,
                "duration": 60,
                "instructions": "Đọc các đoạn văn và trả lời câu hỏi.",
                "questions": create_section_questions("reading", test_num)
            },
            {
                "title": "Writing",
                "order_num": 3,
                "duration": 60,
                "instructions": "Hoàn thành 2 bài viết theo yêu cầu.",
                "questions": create_writing_questions(test_num)
            },
            {
                "title": "Speaking",
                "order_num": 4,
                "duration": 12,
                "instructions": "Trả lời các câu hỏi nói.",
                "questions": create_speaking_questions(test_num)
            }
        ]
    }
    return test_data

def create_section_questions(section_type, test_num):
    """Create sample MCQ questions for Listening/Reading sections"""
    questions = []
    num_questions = 35 if section_type == "listening" else 40
    
    for i in range(1, num_questions + 1):
        questions.append({
            "order_num": i,
            "question_type": "mcq",
            "question_text": f"Question {i} - {section_type.capitalize()} (Test {test_num})",
            "points": 1,
            "config": {
                "options": [
                    {"label": "A", "text": "Option A"},
                    {"label": "B", "text": "Option B"},
                    {"label": "C", "text": "Option C"},
                    {"label": "D", "text": "Option D"}
                ]
            }
        })
    return questions

def create_writing_questions(test_num):
    """Create Writing section questions"""
    return [
        {
            "order_num": 1,
            "question_type": "essay",
            "question_text": f"Task 1 (Test {test_num}): Write an email of about 120 words to a friend describing a recent event.",
            "points": 20,
            "config": {"min_words": 100, "max_words": 200}
        },
        {
            "order_num": 2,
            "question_type": "essay",
            "question_text": f"Task 2 (Test {test_num}): Write an essay of about 250 words discussing the advantages and disadvantages of studying abroad.",
            "points": 30,
            "config": {"min_words": 200, "max_words": 300}
        }
    ]

def create_speaking_questions(test_num):
    """Create Speaking section questions"""
    return [
        {
            "order_num": 1,
            "question_type": "speaking",
            "question_text": f"Part 1 (Test {test_num}): Introduce yourself and answer questions about your daily life.",
            "points": 10,
            "config": {"duration_seconds": 180}
        },
        {
            "order_num": 2,
            "question_type": "speaking",
            "question_text": f"Part 2 (Test {test_num}): Describe a picture and answer follow-up questions.",
            "points": 15,
            "config": {"duration_seconds": 240}
        },
        {
            "order_num": 3,
            "question_type": "speaking",
            "question_text": f"Part 3 (Test {test_num}): Present a topic and have a discussion.",
            "points": 25,
            "config": {"duration_seconds": 300}
        }
    ]

def import_test(test_data):
    """Import a test to the exam platform"""
    print(f"\n📤 Importing: {test_data['title']}")
    try:
        response = requests.post(
            f"{EXAM_API}/admin/import-test",
            headers=get_headers(),
            json=test_data
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                test_id = result.get('data', {}).get('id')
                print(f"  ✅ Success! Test ID: {test_id}")
                return test_id
            else:
                print(f"  ❌ Failed: {result.get('error')}")
        else:
            print(f"  ❌ HTTP Error {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"  ❌ Exception: {e}")
    return None

def main():
    global ADMIN_TOKEN
    
    if not ADMIN_TOKEN:
        print("=" * 60)
        print("VSTEP Exam Importer")
        print("=" * 60)
        print("\nPaste your admin token (from browser console):")
        print("  localStorage.getItem('admin_token')")
        ADMIN_TOKEN = input("\nToken: ").strip()
    
    if not ADMIN_TOKEN:
        print("❌ No token provided!")
        return
    
    # Delete existing tests
    delete_all_tests()
    
    # Define 7 VSTEP tests with levels
    test_configs = [
        (1, "B1"),
        (2, "B2"),
        (3, "B2"),
        (4, "B2"),
        (5, "C1"),
        (6, "C1"),
        (7, "C1"),
    ]
    
    print("\n" + "=" * 60)
    print("Creating 7 VSTEP Tests")
    print("=" * 60)
    
    imported = 0
    for test_num, level in test_configs:
        test_data = create_vstep_test(test_num, level)
        
        # Save JSON file
        json_path = f"vstep_test_{test_num}_{level}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(test_data, f, indent=2, ensure_ascii=False)
        print(f"\n📄 Saved: {json_path}")
        
        # Import to platform
        test_id = import_test(test_data)
        if test_id:
            imported += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Import Complete! {imported}/7 tests created")
    print("=" * 60)

if __name__ == "__main__":
    main()
