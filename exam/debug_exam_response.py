
import requests
import json

# API Configuration
API_BASE = "https://vantrangedu-api.bangachieu2.workers.dev"
EXAM_API = f"{API_BASE}/exam-platform"
ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJhZG1pbjEiLCJyb2xlIjoiYWRtaW4ifQ==.zLTN5qD3VjPhen966WUcTguzA6gcFdG+1TlUzBTSo1I="

def get_headers():
    return {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {ADMIN_TOKEN}'
    }

def main():
    test_id = 91 # The last imported C1 test (ID 85-91)
    print(f"Fetching details for Test ID: {test_id}...")
    
    try:
        response = requests.get(f"{EXAM_API}/admin/tests/{test_id}/details", headers=get_headers())
        if response.status_code == 200:
            data = response.json().get('data', {})
            sections = data.get('sections', [])
            if sections:
                first_section = sections[0]
                questions = first_section.get('questions', [])
                if questions:
                    q1 = questions[0]
                    print("\n--- Question 1 Data ---")
                    print(json.dumps(q1, indent=2))
                    
                    print("\n--- Detail Check ---")
                    print(f"options_json type: {type(q1.get('options_json'))}")
                    print(f"options_json value: {q1.get('options_json')}")
                    print(f"options type: {type(q1.get('options'))}")
                    print(f"options value: {q1.get('options')}")
                else:
                    print("No questions found in section 1")
            else:
                print("No sections found")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    main()
