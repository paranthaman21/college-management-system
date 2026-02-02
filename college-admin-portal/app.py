from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import os
import bcrypt
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from supabase import create_client, Client
from datetime import datetime
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Secret Key is required for Session management
# Secret Key is required for Session management
app.secret_key = os.getenv("SECRET_KEY", "fallback_secret_key_if_env_missing")
app.config['SESSION_COOKIE_NAME'] = 'college_admin_session'
app.config['PERMANENT_SESSION_LIFETIME'] = 1800 # 30 minutes

# --- Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
ADMIN_USER = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD", "admin")
CREDENTIAL_LOG_EMAIL = os.getenv("CREDENTIAL_LOG_EMAIL")
IT_DEPARTMENT_EMAIL = os.getenv("IT_DEPARTMENT_EMAIL")

# Initialize Supabase Client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase!")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
else:
    print("⚠️ Supabase credentials missing in .env")

# --- Login Decorator ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username == ADMIN_USER and password == ADMIN_PASS:
            session['logged_in'] = True
            return redirect(url_for('dashboard'))
        else:
            error = 'Invalid Credentials. Please try again.'
            
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/students.html')
@login_required
def students_page():
    return render_template('students.html')

@app.route('/faculty.html')
@login_required
def faculty_page():
    return render_template('faculty.html')

# --- API Endpoints ---
# NOTE: In a full production app, you would also JWT protect these APIs.
# For this session-based app, we will let them rely on the session cookie if called from browser,
# or leave them open for now (assuming frontend calls them). 
# But strictly speaking, we can check session here too.

def check_api_auth():
    if 'logged_in' not in session:
        return jsonify({"error": "Unauthorized"}), 401

@app.route('/api/stats', methods=['GET'])
def get_stats():
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    if not supabase:
        return jsonify({"total_students": 0, "total_faculty": 0, "total_courses": 45})
    
    try:
        students_res = supabase.table('students').select('*', count='exact').execute()
        faculty_res = supabase.table('faculty').select('*', count='exact').execute()
        
        return jsonify({
            "total_students": students_res.count if students_res.count is not None else len(students_res.data),
            "total_faculty": faculty_res.count if faculty_res.count is not None else len(faculty_res.data),
            "total_courses": 45
        })
    except Exception as e:
        print(f"Stats Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-password', methods=['POST'])
def generate_password():
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401

    chars = string.ascii_letters + string.digits + "!@#$%"
    password = ''.join(random.choice(chars) for i in range(16))
    
    return jsonify({
        "password": password,
        "masked": "**************" 
    })

@app.route('/api/students', methods=['POST'])
def add_student():
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    try:
        # 1. Hash Password
        password = data.get('password')
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # 2. Save to Supabase
        student_data = {
            "name": data['name'],
            "department": data['department'],
            "year": data['year'],
            "email": data['email'],
            "contact": data['contact'],
            "password_hash": hashed
        }
        
        if supabase:
            res = supabase.table('students').insert(student_data).execute()
            
        # 3. Send Email to Configured Log Email
        if CREDENTIAL_LOG_EMAIL:
            send_email(
                to_email=CREDENTIAL_LOG_EMAIL,
                subject=f"New Student Credentials: {data['name']}",
                body=f"""
                --- New Student Account Created ---

                Name: {data['name']}
                Department: {data['department']}
                Student Email: {data['email']}
                
                Login Credentials:
                ------------------
                Username/Email: {data['email']}
                Password: {password}
                
                This is an automated message. Please securely transmit these credentials to the student.
                """
            )
        else:
            print("⚠️ CREDENTIAL_LOG_EMAIL not set, skipping email.")
        
        return jsonify({"message": "Student created", "data": student_data})

    except Exception as e:
        print(f"Add Student Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/all-students', methods=['GET'])
def get_all_students():
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401
    if not supabase: return jsonify([])
    try:
        response = supabase.table('students').select("*").order('id', desc=False).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/students/<int:id>', methods=['PUT'])
def update_student(id):
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    
    if supabase:
        try:
            supabase.table('students').update(data).eq('id', id).execute()
        except Exception as e:
            print(f"Update Error: {e}")
            return jsonify({"error": str(e)}), 500
    
    # IT Dept Notification
    if IT_DEPARTMENT_EMAIL:
        send_email(
            to_email=IT_DEPARTMENT_EMAIL, 
            subject="⚠️ Audit Alert: Student Data Modified",
            body=f"""
            --- Student Record Updated ---
            
            Student ID: {id}
            
            Updated Details:
            {data}
            
            Updated By: Admin
            Timestamp: {datetime.now()}
            """
        )
    return jsonify({"message": "Updated and Notified"})

@app.route('/api/students/<int:id>', methods=['DELETE'])
def delete_student(id):
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    # 1. Get Details for Audit Log before deleting
    student_details = "Unknown Student"
    if supabase:
        try:
            res = supabase.table('students').select('*').eq('id', id).execute()
            if res.data:
                student_details = res.data[0]
            
            # 2. Delete from Supabase
            supabase.table('students').delete().eq('id', id).execute()
        except Exception as e:
             return jsonify({"error": str(e)}), 500

    # 3. IT Dept Audit Notification
    if IT_DEPARTMENT_EMAIL:
        send_email(
            to_email=IT_DEPARTMENT_EMAIL, 
            subject="❌ Audit Alert: Student Record DELETED",
            body=f"""
            --- Student Record Deleted ---
            
            Student ID: {id}
            
            Deleted Record Details:
            {student_details}
            
            Action By: Admin
            Timestamp: {datetime.now()}
            """
        )
    return jsonify({"message": "Student Deleted"})

@app.route('/api/faculty', methods=['POST'])
def add_faculty():
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    try:
        # 1. Hash Password
        password = data.get('password')
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        faculty_data = {
            "name": data['name'],
            "department": data['department'],
            "email": data['email'],
            "contact": data['contact'],
            "password_hash": hashed
        }
        
        if supabase:
            supabase.table('faculty').insert(faculty_data).execute()
        
        # 2. Send Email to Configured Log Email
        if CREDENTIAL_LOG_EMAIL:
            send_email(
                to_email=CREDENTIAL_LOG_EMAIL,
                subject=f"New Faculty Credentials: {data['name']}",
                body=f"""
                --- New Faculty Account Created ---

                Name: {data['name']}
                Department: {data['department']}
                Faculty Email: {data['email']}
                
                Login Credentials:
                ------------------
                Username/Email: {data['email']}
                Password: {password}
                
                This is an automated message. Please securely transmit these credentials to the faculty member.
                """
            )
        else:
             print("⚠️ CREDENTIAL_LOG_EMAIL not set, skipping email.")

        return jsonify({"message": "Faculty Added"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/faculty/<int:id>', methods=['PUT'])
def update_faculty(id):
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    
    if supabase:
        try:
            supabase.table('faculty').update(data).eq('id', id).execute()
        except Exception as e:
            print(f"Update Error: {e}")
            return jsonify({"error": str(e)}), 500
    
    # IT Dept Notification
    if IT_DEPARTMENT_EMAIL:
        send_email(
            to_email=IT_DEPARTMENT_EMAIL, 
            subject="⚠️ Audit Alert: Faculty Data Modified",
            body=f"""
            --- Faculty Record Updated ---
            
            Faculty ID: {id}
            
            Updated Details:
            {data}
            
            Updated By: Admin
            Timestamp: {datetime.now()}
            """
        )
    return jsonify({"message": "Updated and Notified"})

@app.route('/api/faculty/<int:id>', methods=['DELETE'])
def delete_faculty(id):
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401

    # 1. Get Details for Audit Log
    faculty_details = "Unknown Faculty"
    if supabase:
        try:
            res = supabase.table('faculty').select('*').eq('id', id).execute()
            if res.data:
                faculty_details = res.data[0]

            # 2. Delete
            supabase.table('faculty').delete().eq('id', id).execute()
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    # 3. IT Dept Notification
    if IT_DEPARTMENT_EMAIL:
        send_email(
            to_email=IT_DEPARTMENT_EMAIL, 
            subject="❌ Audit Alert: Faculty Record DELETED",
            body=f"""
            --- Faculty Record Deleted ---
            
            Faculty ID: {id}
            
            Deleted Record Details:
            {faculty_details}
            
            Action By: Admin
            Timestamp: {datetime.now()}
            """
        )
    return jsonify({"message": "Faculty Deleted"})

@app.route('/api/all-faculty', methods=['GET'])
def get_all_faculty():
    if 'logged_in' not in session: return jsonify({"error": "Unauthorized"}), 401
    if not supabase: return jsonify([])
    try:
        response = supabase.table('faculty').select("*").order('id', desc=False).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Helper Functions ---

def send_email(to_email, subject, body):
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
