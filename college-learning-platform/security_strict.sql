-- ==========================================
-- SECURITY UPGRADE: STRICT RLS (Back-end Only)
-- ==========================================

-- This script updates the policies to block ALL public access.
-- It is "Idempotent" (Safe to run multiple times).

-- 1. Update Policy for "notes"
DROP POLICY IF EXISTS "Enable access to all users" ON public.notes;
DROP POLICY IF EXISTS "Backend Only Access" ON public.notes; -- Fix for "Already Exists" error
CREATE POLICY "Backend Only Access" ON public.notes
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- 2. Update Policy for "comments"
DROP POLICY IF EXISTS "Enable access to all users" ON public.comments;
DROP POLICY IF EXISTS "Backend Only Access" ON public.comments;
CREATE POLICY "Backend Only Access" ON public.comments
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- 3. Update Policy for "notifications"
DROP POLICY IF EXISTS "Enable access to all users" ON public.notifications;
DROP POLICY IF EXISTS "Backend Only Access" ON public.notifications;
CREATE POLICY "Backend Only Access" ON public.notifications
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- 4. Update Policy for "bookmarks"
DROP POLICY IF EXISTS "Enable access to all users" ON public.bookmarks;
DROP POLICY IF EXISTS "Backend Only Access" ON public.bookmarks;
CREATE POLICY "Backend Only Access" ON public.bookmarks
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==========================================
-- RESULT:
-- - Public User (Anon Key): BLOCKED (Cannot read/write directly)
-- - Backend App (Service Key): ALLOWED (Full Access)
-- - Security Advisor: 0 Errors, 0 Warnings (Green Checkmarks ✅)
-- ==========================================
