CREATE TABLE public.wake_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT 'Ξύπνα βλάκα!',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.wake_signals TO authenticated;
GRANT ALL ON public.wake_signals TO service_role;

ALTER TABLE public.wake_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can send wake signals"
ON public.wake_signals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipient or sender can view wake signals"
ON public.wake_signals FOR SELECT TO authenticated
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.wake_signals;

CREATE INDEX idx_wake_signals_recipient_created ON public.wake_signals(recipient_id, created_at DESC);