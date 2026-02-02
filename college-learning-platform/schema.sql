-- Notes uploaded by faculty
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER,
  department VARCHAR(10),
  year INTEGER,
  subject VARCHAR(100),
  title VARCHAR(200),
  description TEXT,
  youtube_link VARCHAR(500),
  file_url VARCHAR(500), -- Supabase Storage
  faculty_name VARCHAR(100),
  ai_summary TEXT, -- Stores auto-generated AI summary
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student ratings/comments
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  note_id INTEGER,
  student_name VARCHAR(100),
  student_email VARCHAR(100),
  rating INTEGER CHECK (rating >=1 AND rating <=5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Faculty notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  faculty_email VARCHAR(100),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student bookmarks (localStorage + sync)
CREATE TABLE bookmarks (
  id SERIAL PRIMARY KEY,
  student_email VARCHAR(100),
  note_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Faculty Reminders for Students
CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER,
  faculty_name VARCHAR(100),
  department VARCHAR(50),
  target_year INTEGER, -- 1, 2, 3, 4
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
