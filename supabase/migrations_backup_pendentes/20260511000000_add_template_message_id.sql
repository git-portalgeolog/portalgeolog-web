ALTER TABLE public.os_passenger_confirmations
ADD COLUMN IF NOT EXISTS template_message_id text;
