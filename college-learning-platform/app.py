from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
import os
import bcrypt
from supabase import create_client, Client
import smtplib
from email.mime.text import MIMEText
import google.generativeai as genai
import PyPDF2
import io
import requests

# Load env variables
load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv("SECRET_KEY", "super-secret-key-phase2")
app.config['SESSION_COOKIE_NAME'] = 'college_learning_session'
app.config['PERMANENT_SESSION_LIFETIME'] = 3600 # 1 hour

# --- DATABASE CONFIG ---
# Phase 1: Admin DB (Read-Only Authorization)
ADMIN_URL = os.getenv("ADMIN_SUPABASE_URL")
ADMIN_KEY = os.getenv("ADMIN_SUPABASE_KEY")
admin_client: Client = create_client(ADMIN_URL, ADMIN_KEY) if ADMIN_URL and ADMIN_KEY else None

# Phase 2: Learning DB (Content Management)
LEARNING_URL = os.getenv("LEARNING_SUPABASE_URL")
LEARNING_KEY = os.getenv("LEARNING_SUPABASE_SERVICE_ROLE_KEY") # Use Service Key for Backend
learning_client: Client = create_client(LEARNING_URL, LEARNING_KEY) if LEARNING_URL and LEARNING_KEY else None

print(f"DEBUG: Learning DB URL: {LEARNING_URL}")
print(f"DEBUG: Learning Key Loaded: {'YES' if LEARNING_KEY else 'NO'}")
if LEARNING_KEY: print(f"DEBUG: Key starts with: {LEARNING_KEY[:10]}...")
    
# --- AI CONFIG ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    # NETWORK FIX: Force REST transport to avoid "RemoteDisconnected" (gRPC blocks)
    genai.configure(api_key=GEMINI_API_KEY, transport="rest")
    
    # Using 'gemini-flash-latest' - CONFIRMED AVAILABLE in user logs
    model = genai.GenerativeModel('gemini-flash-latest')
else:
    model = None
    print("⚠️ GEMINI_API_KEY missing. AI features disabled.")

# Helper to check if logged in
def is_logged_in():
    return 'user_id' in session

@app.route('/')
def index():
    if is_logged_in():
        if session.get('role') == 'faculty':
            return redirect(url_for('faculty_dashboard', dept=session.get('dept', 'CSE')))
        return redirect(url_for('student_dashboard', dept=session.get('dept', 'CSE'), year=session.get('year', 1)))
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))
@app.after_request
def add_header(response):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers['Cache-Control'] = 'public, max-age=0'
    return response

# --- AUTH API ---
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    role = data.get('role') # 'student' or 'faculty'
    
    if not admin_client:
        return jsonify({"error": "Admin DB connection failed"}), 500

    try:
        table_name = 'students' if role == 'student' else 'faculty'
        
        # Query Admin DB
        response = admin_client.table(table_name).select('*').eq('email', email).execute()
        user_record = response.data[0] if response.data else None
        
        if user_record:
            # Check Password
            stored_hash = user_record.get('password_hash')
            if stored_hash and bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
                # Login Success
                session['user_id'] = user_record['id'] # Beware: Assuming ID is consistent
                session['email'] = email
                session['role'] = role
                session['name'] = user_record['name']
                session['dept'] = user_record['department']
                if role == 'student':
                    # Normalize year to ensure it's an integer (e.g., "II" -> 2)
                    raw_year = user_record.get('year')
                    normalized_year = normalize_year(raw_year)
                    session['year'] = normalized_year
                
                redirect_url = f"/student-{user_record['department']}-{session['year']}/" if role == 'student' else f"/faculty-{user_record['department']}/"
                print(f"DEBUG: Redirecting to {redirect_url}")
                
                return jsonify({
                    "success": True,
                    "redirect": redirect_url
                })
        
        return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        print(f"Auth Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- PORTAL ROUTES ---

# Dynamic Route for Student Portals (CSE1...CIVIL4)
@app.route('/student-<dept>-<year>/')
@app.route('/student-<dept>-<year>')
def student_dashboard(dept, year):
    print(f"DEBUG: Student Dashboard hit with Dept: {dept}, Year: {year}")
    if not is_logged_in() or session.get('role') != 'student':
        print("DEBUG: Not logged in or not a student, redirecting to login")
        return redirect(url_for('login'))
        
    # SECURITY FIX: Ensure User is accessing THEIR OWN page
    # 1. Normalize URL year to int for comparison
    url_year_int = normalize_year(year)
    session_year_int = normalize_year(session.get('year'))
    
    if session.get('dept') != dept or session_year_int != url_year_int:
        print(f"SECURITY ALERT: Student {session.get('email')} tried to access {dept}-{year}")
        # Force Redirect to their actual page
        return redirect(url_for('student_dashboard', dept=session.get('dept'), year=session.get('year')))
    
    return render_template('student_portal.html', dept=dept, year=year, user=session)

@app.route('/faculty-<dept>/')
def faculty_dashboard(dept):
    if not is_logged_in() or session.get('role') != 'faculty':
        return redirect(url_for('login'))
    
    # SECURITY FIX: Ensure Faculty is accessing THEIR OWN Dept
    if session.get('dept') != dept:
        print(f"SECURITY ALERT: Faculty {session.get('email')} tried to access {dept}")
        return redirect(url_for('faculty_dashboard', dept=session.get('dept')))

    return render_template('faculty_portal.html', dept=dept, user=session)

# --- SUBJECTS DATA (HARD-CODED) ---
SUBJECTS_MAP = {
    "CSE": {
        1: ["Programming", "Data Structures", "Math-I"],
        2: ["Algorithms", "DBMS", "OS", "Networking"],
        3: ["Web Tech", "AI", "ML", "Cloud Computing"],
        4: ["Projects", "Internship", "Electives"]
    },
    "ECE": {
        1: ["Digital Circuits", "Signals", "Physics"],
        2: ["VLSI", "Embedded Systems", "Communication"],
        3: ["Microprocessors", "DSP", "Antenna"],
        4: ["IoT", "Wireless Networks"]
    },
    "MECH": {
        1: ["Thermodynamics", "Mechanics"], 2: ["Manufacturing", "CAD/CAM"], 
        3: ["Robotics", "Mechatronics"], 4: ["Projects"]
    },
    "CIVIL": {
        1: ["Structures", "Geotech"], 2: ["Surveying", "Concrete"], 
        3: ["Transportation", "Environment"], 4: ["Projects"]
    }
}

def normalize_year(y):
    if not y: return 1
    y_str = str(y).upper().strip()
    mapping = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "1ST": 1, "2ND": 2, "3RD": 3, "4TH": 4}
    if y_str in mapping: return mapping[y_str]
    # Try to extract first digit
    import re
    digits = re.findall(r'\d+', y_str)
    return int(digits[0]) if digits else 1

def generate_ai_summary(file_url, title):
    """
    Downloads PDF, extracts text, and generates a 3-bullet summary using Gemini.
    """
    if not model or not file_url: return None
    
    try:
        print(f"DEBUG: Generating AI Summary for {title}...")
        # 1. Download the PDF
        response = requests.get(file_url)
        if response.status_code != 200:
            print("Failed to download PDF")
            return "Summary unavailable (Could not download PDF)."
            
        # 2. Extract Text
        pdf_file = io.BytesIO(response.content)
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        # Read first 5 pages max to save time/tokens
        for page in reader.pages[:5]: 
            text += page.extract_text() + "\n"
            
        if len(text) < 50:
             return "Summary unavailable (Not enough text found)."

        # 3. Ask Gemini
        prompt = f"Summarize the following lecture note titled '{title}' into 3 concise, easy-to-read bullet points. Keep it under 50 words. \n\nContent:\n{text}"
        response = model.generate_content(prompt)
        
        return response.text
    except Exception as e:
        print(f"AI Summary Error Details: {e}")
        
        # DEBUG: Print available models to find the correct name
        try:
            print("--- AVAILABLE MODELS ---")
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    print(m.name)
            print("------------------------")
        except:
            print("Could not list models")

        return f"Summary unavailable (AI Error: {str(e)})"

# --- DELETE NOTE API ---
@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    if not is_logged_in() or session.get('role') != 'faculty':
        return jsonify({"error": "Unauthorized"}), 403
    
    try:
        # Security: Only allow deleting notes from OWN department
        # First, fetch the note to check department
        res = learning_client.table('notes').select('*').eq('id', note_id).execute()
        if not res.data:
             return jsonify({"error": "Note not found"}), 404
             
        note = res.data[0]
        if note['department'] != session.get('dept'):
            return jsonify({"error": "Unauthorized: You can only delete notes from your department"}), 403
            
        # Perform Delete
        learning_client.table('notes').delete().eq('id', note_id).execute()
        return jsonify({"message": "Note deleted successfully"})
        
    except Exception as e:
        print(f"Delete Error: {e}")
        return jsonify({"error": str(e)}), 500

# --- SUBJECTS API ---
@app.route('/api/subjects/<dept>/<year>')
def get_subjects(dept, year):
    # Default to empty list if not found
    dept_data = SUBJECTS_MAP.get(dept, {})
    subjects = dept_data.get(normalize_year(year), [])
    return jsonify(subjects)

# --- NOTES API ---
@app.route('/api/notes', methods=['GET', 'POST'])
def handle_notes():
    if not is_logged_in(): return jsonify({"error": "Unauthorized"}), 401

    if request.method == 'GET':
        dept = request.args.get('dept')
        year = request.args.get('year')
        subject = request.args.get('subject') # Optional filter
        
        try:
            query = learning_client.table('notes').select('*').eq('department', dept)
            
            if year:
                # Normalize year to match integer column in DB
                query = query.eq('year', normalize_year(year))
            
            if subject:
                query = query.eq('subject', subject)
            
            res = query.order('created_at', desc=True).execute()
            return jsonify(res.data)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if request.method == 'POST':
        # Faculty Upload
        if session['role'] != 'faculty': return jsonify({"error": "Only faculty can upload"}), 403
        
        data = request.json
        # SECURITY FORCE: Use session department, ignore client sent department
        dept = session['dept'] 
        year_raw = data['year']
        year = normalize_year(year_raw)
        subject = data['subject']

        # Validation: Check if subject belongs to Dept + Year
        valid_subjects = SUBJECTS_MAP.get(dept, {}).get(year, [])
        if subject not in valid_subjects:
             return jsonify({"error": f"Invalid subject '{subject}' for {dept} Year {year}"}), 400

        try:
            note_data = {
                "faculty_id": session['user_id'], # Keep in mind if IDs clash between DBs, but generally OK
                "faculty_name": session['name'],
                "department": dept,
                "year": year,
                "subject": subject,
                "title": data['title'],
                "description": data['description'],
                "file_url": data.get('file_url'),
                "youtube_link": data.get('youtube_link'),
                # Generating AI Summary (Note: This might be slow, effectively blocks request)
                # In prod, use background tasks (Celery/Redis)
                "ai_summary": generate_ai_summary(data.get('file_url'), data['title']) 
            }
            res = learning_client.table('notes').insert(note_data).execute()
            return jsonify({"message": "Note uploaded", "data": res.data})
        except Exception as e:
            return jsonify({"error": str(e)}), 500


# --- REMINDERS API ---
@app.route('/api/reminders', methods=['GET', 'POST'])
def handle_reminders():
    if not is_logged_in(): return jsonify({"error": "Unauthorized"}), 401
    
    # GET: Fetch Reminders
    if request.method == 'GET':
        role = session.get('role')
        dept = session.get('dept')
        
        try:
            query = learning_client.table('reminders').select('*').eq('department', dept)
            
            if role == 'student':
                # Filter by Student's Year
                year = session.get('year')
                query = query.eq('target_year', year)
            elif role == 'faculty':
                # Faculty sees what they sent (or all from their dept)
                # Let's show all from their dept for now so they see history
                pass
                
            res = query.order('created_at', desc=True).execute()
            return jsonify(res.data)
        except Exception as e:
            print(f"Fetch Reminders Error: {e}")
            return jsonify({"error": str(e)}), 500

    # POST: Send Reminder (Faculty Only)
    if request.method == 'POST':
        if session.get('role') != 'faculty':
            return jsonify({"error": "Only faculty can send reminders"}), 403
            
        data = request.json
        print(f"DEBUG: Posting reminder: {data}")
        
        try:
            reminder_data = {
                "faculty_id": session['user_id'],
                "faculty_name": session['name'],
                "department": session['dept'],
                "target_year": normalize_year(data.get('year')), 
                "message": data.get('message')
            }
            
            # Simple Validation
            if not reminder_data['message']:
                return jsonify({"error": "Message cannot be empty"}), 400
                
            res = learning_client.table('reminders').insert(reminder_data).execute()
            return jsonify({"message": "Reminder sent successfully", "data": res.data})
            
        except Exception as e:
            print(f"Send Reminder Error: {e}")
            return jsonify({"error": str(e)}), 500

@app.route('/api/reminders/<int:id>', methods=['DELETE'])
def delete_reminder(id):
    if not is_logged_in() or session.get('role') != 'faculty':
        return jsonify({"error": "Unauthorized"}), 403

    try:
        # Security: Check if reminder belongs to faculty's department
        res = learning_client.table('reminders').select('*').eq('id', id).execute()
        if not res.data:
            return jsonify({"error": "Reminder not found"}), 404
        
        reminder = res.data[0]
        if reminder['department'] != session.get('dept'):
            return jsonify({"error": "Unauthorized: You can only delete reminders from your department"}), 403
            
        learning_client.table('reminders').delete().eq('id', id).execute()
        return jsonify({"message": "Reminder deleted successfully"})
        
    except Exception as e:
        print(f"Delete Reminder Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
