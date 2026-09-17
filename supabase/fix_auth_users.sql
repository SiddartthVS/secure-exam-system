-- ==========================================================
-- FIX SUPABASE AUTH ERROR: "Database error querying schema"
-- Run this in Supabase SQL Editor to fix NULL values in auth.users
-- and link auth.identities for GoTrue!
-- ==========================================================

-- 1. Fix NULL string columns that cause GoTrue driver scan error
UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    is_sso_user = COALESCE(is_sso_user, false)
WHERE email LIKE '%@exam.gov.in';

-- 2. Ensure identities table has matching records for each user
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    id,
    id,
    json_build_object('sub', id::text, 'email', email),
    'email',
    id::text,
    now(),
    now(),
    now()
FROM auth.users
WHERE email LIKE '%@exam.gov.in'
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. Verify profiles table is linked
INSERT INTO public.profiles (id, email, role, region_id, centre_id)
VALUES 
    (
        '22222222-2222-2222-2222-222222222222'::uuid,
        'admin@exam.gov.in',
        'central_admin',
        NULL,
        NULL
    ),
    (
        '11111111-1111-1111-1111-111111111101'::uuid,
        'region1@exam.gov.in',
        'region',
        (SELECT id FROM regions WHERE region_code = 'REG-101'),
        NULL
    ),
    (
        '11111111-1111-1111-1111-111111111102'::uuid,
        'region2@exam.gov.in',
        'region',
        (SELECT id FROM regions WHERE region_code = 'REG-102'),
        NULL
    ),
    (
        '11111111-1111-1111-1111-111111111103'::uuid,
        'region3@exam.gov.in',
        'region',
        (SELECT id FROM regions WHERE region_code = 'REG-103'),
        NULL
    ),
    (
        '11111111-1111-1111-1111-111111111104'::uuid,
        'region4@exam.gov.in',
        'region',
        (SELECT id FROM regions WHERE region_code = 'REG-104'),
        NULL
    ),
    (
        '11111111-1111-1111-1111-111111111105'::uuid,
        'region5@exam.gov.in',
        'region',
        (SELECT id FROM regions WHERE region_code = 'REG-105'),
        NULL
    ),
    (
        '33333333-3333-3333-3333-333333333301'::uuid,
        'centre1@exam.gov.in',
        'exam_centre',
        NULL,
        (SELECT id FROM exam_centres WHERE centre_code = 'CENTRE-901')
    ),
    (
        '33333333-3333-3333-3333-333333333302'::uuid,
        'centre2@exam.gov.in',
        'exam_centre',
        NULL,
        (SELECT id FROM exam_centres WHERE centre_code = 'CENTRE-902')
    )
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    region_id = EXCLUDED.region_id,
    centre_id = EXCLUDED.centre_id;
