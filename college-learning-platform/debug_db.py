import os
import sys
from dotenv import load_dotenv
try:
    from supabase import create_client
except ImportError:
    print("❌ Error: supabase library not found. Run 'pip install supabase'")
    sys.exit(1)

load_dotenv()

url = os.getenv("ADMIN_SUPABASE_URL")
key = os.getenv("ADMIN_SUPABASE_KEY")

if not url or not key:
    print("❌ Error: ADMIN_SUPABASE_URL or ADMIN_SUPABASE_KEY not found in .env")
    sys.exit(1)

try:
    supabase = create_client(url, key)
    res = supabase.table('students').select('*').limit(5).execute()
    
    if res.data:
        print(f"Found {len(res.data)} students:")
        for s in res.data:
            name = s.get('name', 'N/A')
            dept = s.get('department', 'N/A')
            year = s.get('year', 'N/A')
            email = s.get('email', 'N/A')
            print(f"-> {name} | {dept} | {year} | {email}")
    else:
        print("No students found.")
except Exception as e:
    print(f"❌ Database error: {str(e)}")
