"""
VSTEP Import Script - Realistic Content Version (Fixed Options)
Creates 7 VSTEP tests (B1, B2, C1) with realistic dummy data for testing
Corrected: Uses 'value' and 'label' for options to match frontend QuestionRenderer
"""

import json
import requests
import random

# API Configuration
API_BASE = "https://vantrangedu-api.bangachieu2.workers.dev"
EXAM_API = f"{API_BASE}/exam-platform"

# Admin token
ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJhZG1pbjEiLCJyb2xlIjoiYWRtaW4ifQ==.zLTN5qD3VjPhen966WUcTguzA6gcFdG+1TlUzBTSo1I="

def get_headers():
    return {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ADMIN_TOKEN}'
    }

def delete_all_tests():
    """Delete all existing exam tests to avoid duplicates"""
    print("\n🗑️ Deleting all existing tests...")
    try:
        response = requests.get(f"{EXAM_API}/tests", headers=get_headers())
        if response.status_code == 200:
            result = response.json()
            tests = result.get('data', []) if result.get('success') else []
            for test in tests:
                test_id = test.get('id')
                if test_id:
                    requests.delete(f"{EXAM_API}/admin/tests/{test_id}", headers=get_headers())
            print(f"  ✓ Deleted {len(tests)} tests")
    except Exception as e:
        print(f"  ❌ Error: {e}")

def create_vstep_test(test_num, level):
    """Create a VSTEP test with correct API structure"""
    test_data = {
        "examType": "VSTEP",
        "level": level,
        "title": f"VSTEP Test {test_num} - {level}",
        "description": f"Bài thi thử VSTEP trình độ {level}. Bài thi gồm 4 phần: Listening, Reading, Writing, Speaking.",
        "duration": 150,
        "passingScore": 4.0 if level == "B1" else (6.0 if level == "B2" else 6.5),
        "shuffleQuestions": False,
        "shuffleOptions": True,
        "sections": [
            {
                "name": "Listening",
                "description": "Phần thi nghe hiểu",
                "timeLimit": 45,
                "instructions": "Nghe và trả lời các câu hỏi. Bạn sẽ được nghe mỗi đoạn 2 lần.",
                "isLockedAfterComplete": False,
                "scoringRule": "points_based",
                "questions": create_listening_questions(test_num)
            },
            {
                "name": "Reading",
                "description": "Phần thi đọc hiểu",
                "timeLimit": 60,
                "instructions": "Đọc các đoạn văn và trả lời câu hỏi trắc nghiệm.",
                "isLockedAfterComplete": False,
                "scoringRule": "points_based",
                "questions": create_reading_questions(test_num)
            },
            {
                "name": "Writing",
                "description": "Phần thi viết",
                "timeLimit": 60,
                "instructions": "Hoàn thành 2 bài viết theo yêu cầu đề bài.",
                "isLockedAfterComplete": False,
                "scoringRule": "points_based",
                "questions": create_writing_questions(test_num)
            },
            {
                "name": "Speaking",
                "description": "Phần thi nói",
                "timeLimit": 12,
                "instructions": "Trả lời các câu hỏi nói theo hướng dẫn.",
                "isLockedAfterComplete": False,
                "scoringRule": "points_based",
                "questions": create_speaking_questions(test_num)
            }
        ]
    }
    return test_data

def create_listening_questions(test_num):
    """Create Listening section questions - 35 MCQ"""
    questions = []
    
    # Part 1: Direction (Q1-Q8)
    questions.append({
        "type": "mcq",
        "questionText": "<strong>Part 1:</strong> There are 8 questions in this part. For each question there are four options and a short recording. For each question, choose the correct answer A, B, C or D. <br/><br/><strong>Question 1:</strong> What time will the train leave?",
        "questionData": None,
        "options": [
            {"value": "A", "label": "At 6:30"},
            {"value": "B", "label": "At 6:45"},
            {"value": "C", "label": "At 7:15"},
            {"value": "D", "label": "At 7:30"}
        ],
        "answerKey": "B",
        "points": 1,
        "difficulty": "easy",
        "explanation": "The speaker mentions the train is delayed by 15 minutes from 6:30.",
        "audioUrl": "https://assets.vantrangedu.com/audio/vstep/part1_q1.mp3"
    })
    
    for i in range(2, 9):
        topic = random.choice(["holiday", "meeting", "exam", "party", "new house", "job interview"])
        questions.append({
            "type": "mcq",
            "questionText": f"<strong>Question {i}:</strong> What is the speaker saying about the {topic}?",
            "questionData": None,
            "options": [
                {"value": "A", "label": "It was great"},
                {"value": "B", "label": "It was cancelled"},
                {"value": "C", "label": "It was boring"},
                {"value": "D", "label": "It was expensive"}
            ],
            "answerKey": random.choice(["A", "B", "C", "D"]),
            "points": 1,
            "difficulty": "easy"
        })

    # Part 2: Conversations (Q9-Q20)
    for i in range(9, 21):
        questions.append({
            "type": "mcq",
            "questionText": f"<strong>Part 2 - Question {i}:</strong> Listen to the conversation. Why is the woman worried?",
            "questionData": None,
            "options": [
                {"value": "A", "label": "She lost her keys"},
                {"value": "B", "label": "She is late for work"},
                {"value": "C", "label": "She made a mistake"},
                {"value": "D", "label": "She has no money"}
            ],
            "answerKey": random.choice(["A", "B", "C", "D"]),
            "points": 1,
            "difficulty": "medium"
        })

    # Part 3: Talks (Q21-Q35)
    for i in range(21, 36):
        questions.append({
            "type": "mcq",
            "questionText": f"<strong>Part 3 - Question {i}:</strong> What is the main idea of the lecture?",
            "questionData": None,
            "options": [
                {"value": "A", "label": "Climate change effects"},
                {"value": "B", "label": "Renewable energy sources"},
                {"value": "C", "label": "Carbon footprint reduction"},
                {"value": "D", "label": "Government policies"}
            ],
            "answerKey": random.choice(["A", "B", "C", "D"]),
            "points": 1,
            "difficulty": "hard"
        })
        
    return questions

def create_reading_questions(test_num):
    """Create Reading section questions - 40 MCQ"""
    questions = []
    
    passage_1 = """
    <div class='reading-passage p-4 bg-slate-50 rounded mb-4'>
    <h4 class='font-bold mb-2'>The History of Coffee</h4>
    <p class='mb-2'>Coffee is a brewed drink prepared from roasted coffee beans, the seeds of berries from certain Coffea species. From the coffee fruit, the seeds are separated to produce a stable, raw product: unroasted green coffee. The seeds are then roasted, a process which transforms them into a consumable product: roasted coffee, which is ground into fine particles that are typically steeped in hot water before being filtered out, producing a cup of coffee.</p>
    <p>Coffee is darkly colored, bitter, slightly acidic and has a stimulating effect in humans, primarily due to its caffeine content. It is one of the most popular drinks in the world, and can be prepared and presented in a variety of ways.</p>
    </div>
    """
    
    # Passage 1 Questions (1-10)
    for i in range(1, 11):
        questions.append({
            "type": "mcq",
            "questionText": f"{passage_1 if i==1 else ''}<strong>Question {i}:</strong> What is the primary reason for coffee's stimulating effect?",
            "questionData": None,
            "options": [
                {"value": "A", "label": "Its dark color"},
                {"value": "B", "label": "Its acidity"},
                {"value": "C", "label": "Its caffeine content"},
                {"value": "D", "label": "Its preparation method"}
            ],
            "answerKey": "C",
            "points": 1,
            "difficulty": "easy"
        })

    passage_2 = """
    <div class='reading-passage p-4 bg-slate-50 rounded mb-4'>
    <h4 class='font-bold mb-2'>Artificial Intelligence</h4>
    <p class='mb-2'>Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. Leading AI textbooks define the field as the study of "intelligent agents": any system that perceives its environment and takes actions that maximize its chance of achieving its goals.</p>
    </div>
    """

    # Passage 2 Questions (11-20)
    for i in range(11, 21):
        questions.append({
            "type": "mcq",
            "questionText": f"{passage_2 if i==11 else ''}<strong>Question {i}:</strong> How is AI defined in leading textbooks?",
            "questionData": None,
            "options": [
                {"value": "A", "label": "As human-like robots"},
                {"value": "B", "label": "As intelligent agents"},
                {"value": "C", "label": "As complex calculators"},
                {"value": "D", "label": "As neural networks"}
            ],
            "answerKey": "B",
            "points": 1,
            "difficulty": "medium"
        })
        
    # Passage 3 & 4 (Generic filler for 21-40)
    for i in range(21, 41):
         questions.append({
            "type": "mcq",
            "questionText": f"<strong>Question {i}:</strong> In paragraph 3, the word 'it' refers to...",
            "questionData": None,
            "options": [
                {"value": "A", "label": "The theory"},
                {"value": "B", "label": "The experiment"},
                {"value": "C", "label": "The result"},
                {"value": "D", "label": "The problem"}
            ],
            "answerKey": random.choice(["A", "B", "C", "D"]),
            "points": 1,
            "difficulty": "hard"
        })

    return questions

def create_writing_questions(test_num):
    """Create Writing section questions - 2 essay questions"""
    return [
        {
            "type": "essay",
            "questionText": f"<strong>Task 1:</strong> You should spend about 20 minutes on this task.<br/><br/>You received an email from your English friend, Alex. He asked you about a new hobby you have started.<br/><br/>Write an email to Alex. In your email, you should:<br/>- tell him what hobby it is<br/>- explain why you started it<br/>- say what you like about it.<br/><br/>Write at least 120 words.",
            "questionData": {"minWords": 120, "maxWords": 200},
            "options": None,
            "answerKey": "",
            "points": 20,
            "difficulty": "medium",
            "explanation": "Check for structure, vocabulary, grammar, and task fulfillment."
        },
        {
            "type": "essay",
            "questionText": f"<strong>Task 2:</strong> You should spend about 40 minutes on this task.<br/><br/>Read the following text:<br/><em>'Some people believe that university education should be free for everyone. Others think that students should pay for their education.'</em><br/><br/>Write an essay discussing both views and give your own opinion.<br/><br/>Write at least 250 words.",
            "questionData": {"minWords": 250, "maxWords": 400},
            "options": None,
            "answerKey": "",
            "points": 30,
            "difficulty": "hard",
            "explanation": "Ensure clear paragraphing and logical flow."
        }
    ]

def create_speaking_questions(test_num):
    """Create Speaking section questions - 3 speaking tasks"""
    return [
        {
            "type": "speaking",
            "questionText": f"<strong>Part 1: Social Interaction (3 minutes)</strong><br/>Let's talk about <strong>Music</strong>.<br/><br/>- Do you like listening to music?<br/>- What kind of music do you like best?<br/>- When do you usually listen to music?",
            "questionData": {"durationSeconds": 180, "preparationSeconds": 30},
            "options": None,
            "answerKey": "",
            "points": 10,
            "difficulty": "easy"
        },
        {
            "type": "speaking",
            "questionText": f"<strong>Part 2: Solution Discussion (4 minutes)</strong><br/><strong>Situation:</strong> You are planning a holiday with your friends. There are three options:<br/>1. Going to the beach<br/>2. Climbing a mountain<br/>3. Visiting a city<br/><br/>Which option do you think is the best? Why?",
            "questionData": {"durationSeconds": 240, "preparationSeconds": 60},
            "options": None,
            "answerKey": "",
            "points": 15,
            "difficulty": "medium"
        },
        {
            "type": "speaking",
            "questionText": f"<strong>Part 3: Topic Development (5 minutes)</strong><br/><strong>Topic:</strong> Reading books is important for self-development.<br/><br/>- Expands knowledge<br/>- Improves language skills<br/>- Reduces stress<br/><br/>Discuss the topic above and answer follow-up questions.",
            "questionData": {"durationSeconds": 300, "preparationSeconds": 60},
            "options": None,
            "answerKey": "",
            "points": 25,
            "difficulty": "hard"
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
        
        if response.status_code in [200, 201]:
            result = response.json()
            if result.get('success'):
                data = result.get('data', {})
                test_id = data.get('testId')
                total_q = data.get('totalQuestions', 0)
                print(f"  ✅ Success! Test ID: {test_id}, Questions: {total_q}")
                return test_id
            else:
                print(f"  ❌ Failed: {result.get('error')}")
        else:
            print(f"  ❌ HTTP Error {response.status_code}: {response.text[:500]}")
    except Exception as e:
        print(f"  ❌ Exception: {e}")
    return None

def main():
    # Delete old tests first
    delete_all_tests()

    test_configs = [
        (1, "B1"),
        (2, "B2"),
        (3, "B2"),
        (4, "B2"),
        (5, "C1"),
        (6, "C1"),
        (7, "C1"),
    ]
    
    print("=" * 60)
    print("VSTEP Exam Importer - Realistic with FIXED Options")
    print("=" * 60)
    print(f"\nCreating {len(test_configs)} VSTEP Tests...")
    
    imported = 0
    for test_num, level in test_configs:
        test_data = create_vstep_test(test_num, level)
        test_id = import_test(test_data)
        if test_id:
            imported += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Import Complete! {imported}/{len(test_configs)} tests created")
    print("=" * 60)

if __name__ == "__main__":
    main()
