-- Auto-fill created_by_name on app_notifications INSERT
-- Fixes notifications (e.g. from DB triggers) that set created_by but leave created_by_name null.

-- 1. Backfill existing rows
UPDATE public.app_notifications n
SET created_by_name = COALESCE(
  (SELECT raw_user_meta_data->>'nome' FROM auth.users WHERE id = n.created_by),
  (SELECT email FROM auth.users WHERE id = n.created_by)
)
WHERE n.created_by IS NOT NULL
  AND (n.created_by_name IS NULL OR n.created_by_name = '');

-- 2. Function that fills created_by_name from auth.users
CREATE OR REPLACE FUNCTION public.fill_app_notification_author()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND (NEW.created_by_name IS NULL OR NEW.created_by_name = '') THEN
    SELECT COALESCE(raw_user_meta_data->>'nome', email)
    INTO NEW.created_by_name
    FROM auth.users
    WHERE id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on every new notification insert
DROP TRIGGER IF EXISTS fill_app_notification_author_trigger ON public.app_notifications;
CREATE TRIGGER fill_app_notification_author_trigger
  BEFORE INSERT ON public.app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_app_notification_author();
