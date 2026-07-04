-- Notification triggers for invitations and messages

CREATE OR REPLACE FUNCTION public.notify_on_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
BEGIN
  SELECT user_id INTO target_user FROM public.professional_profiles WHERE id = NEW.invited_profile_id;
  IF target_user IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, entity_type, entity_id)
  VALUES (
    target_user,
    'invitation',
    'New casting invitation',
    COALESCE(NEW.message, 'You have a new invitation.'),
    'invitation',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invitations_notify ON public.invitations;
CREATE TRIGGER invitations_notify
  AFTER INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_invitation();

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant UUID;
BEGIN
  FOR participant IN
    SELECT user_id FROM public.thread_participants
    WHERE thread_id = NEW.thread_id AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, kind, title, body, entity_type, entity_id)
    VALUES (
      participant,
      'message',
      'New message',
      LEFT(NEW.body, 200),
      'message',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify ON public.messages;
CREATE TRIGGER messages_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();
