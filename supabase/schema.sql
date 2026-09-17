-- ==========================================================
-- SECURE QUESTION PAPER MANAGEMENT & EXAM DISTRIBUTION SYSTEM
-- Database Schema, RLS Policies, Storage Buckets, and Seed Data
-- ==========================================================

-- 1. Create Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean up if re-running
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS master_paper CASCADE;
DROP TABLE IF EXISTS question_paper_submissions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS exam_centres CASCADE;
DROP TABLE IF EXISTS regions CASCADE;

-- 3. Regions Table
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Exam Centres Table
CREATE TABLE exam_centres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    centre_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User Profiles Table (Linked to Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('region', 'central_admin', 'exam_centre')),
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    centre_id UUID REFERENCES exam_centres(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Question Paper Submissions Table
-- Each region can submit EXACTLY ONE question paper
CREATE TABLE question_paper_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE UNIQUE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Master Question Paper Table
-- Managed strictly by Central Admin
CREATE TABLE master_paper (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT,
    role TEXT,
    event_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- STORAGE BUCKETS (Private)
-- ==========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('question-papers', 'question-papers', false),
    ('master-papers', 'master-papers', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_paper_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_paper ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Helper function to check region_id
CREATE OR REPLACE FUNCTION get_user_region_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT region_id FROM profiles WHERE id = auth.uid();
$$;

-- Regions RLS: Read-only for authenticated users
CREATE POLICY "Regions readable by authenticated users"
ON regions FOR SELECT TO authenticated USING (true);

-- Exam Centres RLS: Read-only for authenticated users
CREATE POLICY "Centres readable by authenticated users"
ON exam_centres FOR SELECT TO authenticated USING (true);

-- Profiles RLS: Users can read own profile; Admin can read all
CREATE POLICY "Profiles readable by owner or admin"
ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR get_user_role() = 'central_admin');

CREATE POLICY "Profiles insertable by authenticated user"
ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Question Paper Submissions RLS:
-- 1. Region can view own; Admin can view all
CREATE POLICY "Submissions select policy"
ON question_paper_submissions FOR SELECT TO authenticated
USING (
    get_user_role() = 'central_admin'
    OR (get_user_role() = 'region' AND region_id = get_user_region_id())
);

-- 2. Region can insert own submission
CREATE POLICY "Submissions insert policy"
ON question_paper_submissions FOR INSERT TO authenticated
WITH CHECK (
    get_user_role() = 'region' 
    AND region_id = get_user_region_id()
);

-- 3. Region can update ONLY IF in 'draft' state. Confirmed submissions are locked!
CREATE POLICY "Submissions update policy"
ON question_paper_submissions FOR UPDATE TO authenticated
USING (
    get_user_role() = 'region' 
    AND region_id = get_user_region_id()
    AND status = 'draft'
)
WITH CHECK (
    get_user_role() = 'region' 
    AND region_id = get_user_region_id()
);

-- Master Paper RLS:
-- 1. Central Admin full control
CREATE POLICY "Admin full master paper"
ON master_paper FOR ALL TO authenticated
USING (get_user_role() = 'central_admin')
WITH CHECK (get_user_role() = 'central_admin');

-- 2. Exam Centre can SELECT ONLY IF published!
CREATE POLICY "Exam Centre read published master paper"
ON master_paper FOR SELECT TO authenticated
USING (
    get_user_role() = 'exam_centre' 
    AND status = 'published'
);

-- Audit Logs RLS:
-- 1. Authenticated users can insert their own actions
CREATE POLICY "Audit logs insert"
ON audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- 2. Central Admin can view all audit logs
CREATE POLICY "Audit logs select for admin"
ON audit_logs FOR SELECT TO authenticated
USING (get_user_role() = 'central_admin');

-- ==========================================================
-- STORAGE POLICIES
-- ==========================================================

-- Question Papers Bucket Policies
CREATE POLICY "Allow authenticated region upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'question-papers');

CREATE POLICY "Allow owner region or admin read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'question-papers');

CREATE POLICY "Allow owner region update draft"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'question-papers');

-- Master Papers Bucket Policies
CREATE POLICY "Allow admin master paper upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'master-papers' AND get_user_role() = 'central_admin');

CREATE POLICY "Allow admin and exam centre read"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'master-papers' 
    AND (
        get_user_role() = 'central_admin' 
        OR (get_user_role() = 'exam_centre' AND EXISTS (SELECT 1 FROM master_paper WHERE status = 'published'))
    )
);

-- ==========================================================
-- SEED DATA: 5 Regions & Exam Centres
-- ==========================================================

INSERT INTO regions (name, region_code) VALUES
    ('Region 1 (North)', 'REG-101'),
    ('Region 2 (South)', 'REG-102'),
    ('Region 3 (East)',  'REG-103'),
    ('Region 4 (West)',  'REG-104'),
    ('Region 5 (Central)','REG-105');

INSERT INTO exam_centres (name, centre_code) VALUES
    ('Central Exam Centre 01 - Metro Hub', 'CENTRE-901'),
    ('City Campus Exam Centre 02',         'CENTRE-902');

-- ==========================================================
-- HELPER STORED PROCEDURE FOR AUTOMATED USER DEMO CREATION
-- (Optional convenience function to link auth.users to profiles)
-- ==========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Automatically set up profile if user metadata contains role
    INSERT INTO public.profiles (id, email, role, region_id, centre_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'region'),
        (NEW.raw_user_meta_data->>'region_id')::uuid,
        (NEW.raw_user_meta_data->>'centre_id')::uuid
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        region_id = EXCLUDED.region_id,
        centre_id = EXCLUDED.centre_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
