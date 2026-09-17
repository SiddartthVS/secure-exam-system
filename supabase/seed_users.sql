-- ==========================================================
-- SEED AUTH USERS & PROFILES FOR LOCAL / HOSTED SUPABASE
-- Run this in Supabase SQL Editor to populate demonstration users!
-- Password for all Regions: Region@12345
-- Password for Central Admin: Admin@12345
-- Password for Exam Centres: Centre@12345
-- ==========================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to safely create user if not exists
CREATE OR REPLACE FUNCTION create_demo_user(
    p_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_region_id UUID DEFAULT NULL,
    p_centre_id UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- 1. Insert into auth.users with all non-null fields
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            is_sso_user,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            p_id,
            'authenticated',
            'authenticated',
            p_email,
            crypt(p_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            json_build_object('role', p_role, 'region_id', p_region_id, 'centre_id', p_centre_id),
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            false,
            now(),
            now()
        );

        -- 1b. Insert into auth.identities
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            p_id,
            p_id,
            json_build_object('sub', p_id::text, 'email', p_email),
            'email',
            p_id::text,
            now(),
            now(),
            now()
        ) ON CONFLICT (provider, provider_id) DO NOTHING;
    END IF;

    -- 2. Insert or update in public.profiles
    INSERT INTO public.profiles (id, email, role, region_id, centre_id)
    VALUES (p_id, p_email, p_role, p_region_id, p_centre_id)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        region_id = EXCLUDED.region_id,
        centre_id = EXCLUDED.centre_id;
END;
$$;

-- Seed Admin
SELECT create_demo_user(
    '22222222-2222-2222-2222-222222222222'::uuid,
    'admin@exam.gov.in',
    'Admin@12345',
    'central_admin'
);

-- Seed 5 Regions
SELECT create_demo_user(
    '11111111-1111-1111-1111-111111111101'::uuid,
    'region1@exam.gov.in',
    'Region@12345',
    'region',
    (SELECT id FROM regions WHERE region_code = 'REG-101')
);

SELECT create_demo_user(
    '11111111-1111-1111-1111-111111111102'::uuid,
    'region2@exam.gov.in',
    'Region@12345',
    'region',
    (SELECT id FROM regions WHERE region_code = 'REG-102')
);

SELECT create_demo_user(
    '11111111-1111-1111-1111-111111111103'::uuid,
    'region3@exam.gov.in',
    'Region@12345',
    'region',
    (SELECT id FROM regions WHERE region_code = 'REG-103')
);

SELECT create_demo_user(
    '11111111-1111-1111-1111-111111111104'::uuid,
    'region4@exam.gov.in',
    'Region@12345',
    'region',
    (SELECT id FROM regions WHERE region_code = 'REG-104')
);

SELECT create_demo_user(
    '11111111-1111-1111-1111-111111111105'::uuid,
    'region5@exam.gov.in',
    'Region@12345',
    'region',
    (SELECT id FROM regions WHERE region_code = 'REG-105')
);

-- Seed Exam Centres
SELECT create_demo_user(
    '33333333-3333-3333-3333-333333333301'::uuid,
    'centre1@exam.gov.in',
    'Centre@12345',
    'exam_centre',
    NULL,
    (SELECT id FROM exam_centres WHERE centre_code = 'CENTRE-901')
);

SELECT create_demo_user(
    '33333333-3333-3333-3333-333333333302'::uuid,
    'centre2@exam.gov.in',
    'Centre@12345',
    'exam_centre',
    NULL,
    (SELECT id FROM exam_centres WHERE centre_code = 'CENTRE-902')
);
