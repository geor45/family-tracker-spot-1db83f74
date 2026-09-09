-- ============================================================
-- FAMILY-BASED RLS
-- ============================================================

-- Helper:
-- Checks whether a target user belongs to the current user's family.
-- SECURITY DEFINER avoids RLS recursion on family_members.

CREATE OR REPLACE FUNCTION public.is_same_family(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.family_members fm
        WHERE fm.user_id = p_user_id
          AND fm.family_id = public.get_my_family_id()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_same_family(UUID)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_same_family(UUID)
TO authenticated;


-- ============================================================
-- PROFILES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated can view profiles"
ON public.profiles;

CREATE POLICY "Family members can view family profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.is_same_family(id)
);


-- ============================================================
-- LATEST LOCATIONS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated view all latest"
ON public.latest_locations;

CREATE POLICY "Family members can view family latest locations"
ON public.latest_locations
FOR SELECT
TO authenticated
USING (
    public.is_same_family(user_id)
);


-- ============================================================
-- LOCATION HISTORY
-- ============================================================

DROP POLICY IF EXISTS "Authenticated view all history"
ON public.location_history;

CREATE POLICY "Family members can view family location history"
ON public.location_history
FOR SELECT
TO authenticated
USING (
    public.is_same_family(user_id)
);


-- ============================================================
-- WAKE SIGNALS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can send wake signals"
ON public.wake_signals;

DROP POLICY IF EXISTS "Recipient or sender can view wake signals"
ON public.wake_signals;


-- Sender and recipient must both belong to
-- the same family as the authenticated sender.

CREATE POLICY "Family members can send wake signals"
ON public.wake_signals
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND public.is_same_family(recipient_id)
);


CREATE POLICY "Family members can view wake signals"
ON public.wake_signals
FOR SELECT
TO authenticated
USING (
    (
        sender_id = auth.uid()
        OR recipient_id = auth.uid()
    )
    AND public.is_same_family(
        CASE
            WHEN sender_id = auth.uid()
                THEN recipient_id
            ELSE sender_id
        END
    )
);


-- ============================================================
-- FAMILY MEMBERS
-- ============================================================

-- Users must NOT be able to directly insert themselves
-- into arbitrary families.
--
-- Joining a family must happen through join_family().

DROP POLICY IF EXISTS "Users can add themselves to a family"
ON public.family_members;

DROP POLICY IF EXISTS "Users can remove themselves"
ON public.family_members;

REVOKE INSERT, UPDATE, DELETE
ON public.family_members
FROM authenticated;


-- ============================================================
-- FAMILIES
-- ============================================================

-- Prevent arbitrary deletion of a family.
REVOKE DELETE
ON public.families
FROM authenticated;


-- ============================================================
-- EXTRA INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_id
    ON public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_latest_locations_user_id
    ON public.latest_locations(user_id);

CREATE INDEX IF NOT EXISTS idx_wake_signals_sender_recipient
    ON public.wake_signals(sender_id, recipient_id);
