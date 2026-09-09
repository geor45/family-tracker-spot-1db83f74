-- ============================================================
-- FAMILY SYSTEM
-- ============================================================

-- 1. Families
CREATE TABLE public.families (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Family members
CREATE TABLE public.family_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (family_id, user_id)
);

-- Indexes
CREATE INDEX idx_family_members_family_id
    ON public.family_members(family_id);

CREATE INDEX idx_family_members_user_id
    ON public.family_members(user_id);

CREATE INDEX idx_families_owner_id
    ON public.families(owner_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.families TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.family_members TO authenticated;

GRANT ALL ON public.families TO service_role;
GRANT ALL ON public.family_members TO service_role;

-- ============================================================
-- Helper function:
-- Returns the family of the currently authenticated user.
-- SECURITY DEFINER prevents RLS recursion.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT family_id
    FROM public.family_members
    WHERE user_id = auth.uid()
    LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_family_id()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_family_id()
TO authenticated;

-- ============================================================
-- FAMILY POLICIES
-- ============================================================

CREATE POLICY "Members can view their family"
ON public.families
FOR SELECT
TO authenticated
USING (
    id = public.get_my_family_id()
);

CREATE POLICY "Authenticated users can create families"
ON public.families
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = owner_id
);

CREATE POLICY "Owners can update their family"
ON public.families
FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid()
)
WITH CHECK (
    owner_id = auth.uid()
);

-- ============================================================
-- FAMILY MEMBERS POLICIES
-- ============================================================

CREATE POLICY "Members can view their family members"
ON public.family_members
FOR SELECT
TO authenticated
USING (
    family_id = public.get_my_family_id()
);

CREATE POLICY "Users can add themselves to a family"
ON public.family_members
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Users can remove themselves"
ON public.family_members
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);

-- ============================================================
-- CREATE FAMILY FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_family(
    p_name TEXT
)
RETURNS TABLE (
    family_id UUID,
    invite_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_family_id UUID;
    v_invite_code TEXT;
BEGIN

    -- A user can only belong to one family.
    IF EXISTS (
        SELECT 1
        FROM public.family_members
        WHERE user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'User already belongs to a family';
    END IF;

    -- Generate an 8-character invite code.
    LOOP
        v_invite_code :=
            upper(substr(md5(gen_random_uuid()::text), 1, 8));

        EXIT WHEN NOT EXISTS (
            SELECT 1
            FROM public.families
            WHERE families.invite_code = v_invite_code
        );
    END LOOP;

    INSERT INTO public.families (
        name,
        invite_code,
        owner_id
    )
    VALUES (
        trim(p_name),
        v_invite_code,
        auth.uid()
    )
    RETURNING id INTO v_family_id;

    INSERT INTO public.family_members (
        family_id,
        user_id,
        role
    )
    VALUES (
        v_family_id,
        auth.uid(),
        'owner'
    );

    RETURN QUERY
    SELECT v_family_id, v_invite_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_family(TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_family(TEXT)
TO authenticated;

-- ============================================================
-- JOIN FAMILY FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_family(
    p_invite_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_family_id UUID;
BEGIN

    -- A user can only belong to one family.
    IF EXISTS (
        SELECT 1
        FROM public.family_members
        WHERE user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'User already belongs to a family';
    END IF;

    SELECT id
    INTO v_family_id
    FROM public.families
    WHERE invite_code = upper(trim(p_invite_code))
    LIMIT 1;

    IF v_family_id IS NULL THEN
        RAISE EXCEPTION 'Invalid family invite code';
    END IF;

    INSERT INTO public.family_members (
        family_id,
        user_id,
        role
    )
    VALUES (
        v_family_id,
        auth.uid(),
        'member'
    );

    RETURN v_family_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_family(TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.join_family(TEXT)
TO authenticated;

-- ============================================================
-- MIGRATE EXISTING USERS
--
-- Every existing user gets their own family temporarily.
-- This prevents existing accounts from becoming unusable.
-- Later they can join another family through the UI.
-- ============================================================

DO $$
DECLARE
    profile_record RECORD;
    v_family_id UUID;
    v_invite_code TEXT;
BEGIN

    FOR profile_record IN
        SELECT p.id, p.display_name
        FROM public.profiles p
        WHERE NOT EXISTS (
            SELECT 1
            FROM public.family_members fm
            WHERE fm.user_id = p.id
        )
    LOOP

        LOOP
            v_invite_code :=
                upper(substr(md5(gen_random_uuid()::text), 1, 8));

            EXIT WHEN NOT EXISTS (
                SELECT 1
                FROM public.families f
                WHERE f.invite_code = v_invite_code
            );
        END LOOP;

        INSERT INTO public.families (
            name,
            invite_code,
            owner_id
        )
        VALUES (
            COALESCE(profile_record.display_name, 'My Family'),
            v_invite_code,
            profile_record.id
        )
        RETURNING id INTO v_family_id;

        INSERT INTO public.family_members (
            family_id,
            user_id,
            role
        )
        VALUES (
            v_family_id,
            profile_record.id,
            'owner'
        );

    END LOOP;

END;
$$;
