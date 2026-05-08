import requests

url = "https://artykun-ai-quiz-generator.hf.space/auth/register"
try:
    res = requests.post(url, json={"name": "test", "email": "test@test.com", "password": "password"})
    print("STATUS:", res.status_code)
    print("TEXT:", res.text)
except Exception as e:
    print("ERROR:", e)
