-- Students table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  department VARCHAR(50),
  year VARCHAR(10), 
  email VARCHAR(100) UNIQUE,
  contact VARCHAR(15),
  password_hash VARCHAR(255), -- bcrypt hash
  created_at TIMESTAMP DEFAULT NOW()
);

-- Faculty table  
CREATE TABLE faculty (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  department VARCHAR(50),
  email VARCHAR(100) UNIQUE,
  contact VARCHAR(15),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Counters (for dashboard)
CREATE TABLE dashboard_stats (
  id SERIAL PRIMARY KEY,
  total_students INTEGER DEFAULT 0,
  total_faculty INTEGER DEFAULT 0,
  total_courses INTEGER DEFAULT 45,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial stats row
INSERT INTO dashboard_stats (total_students, total_faculty, total_courses) VALUES (0, 0, 45);
