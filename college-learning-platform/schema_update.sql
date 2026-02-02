-- Run this in your Supabase SQL Editor for the "College Learning DB" project

CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER,
  faculty_name VARCHAR(100),
  department VARCHAR(50),
  target_year INTEGER, -- 1, 2, 3, 4
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
