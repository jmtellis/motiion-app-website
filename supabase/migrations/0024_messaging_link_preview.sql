-- Inbox preview labels for link attachment messages

CREATE OR REPLACE FUNCTION public._messaging_message_body_preview(
  p_body text,
  p_message_type text DEFAULT 'text'
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_json jsonb;
BEGIN
  IF v_body IS NULL THEN
    RETURN 'Sent a message.';
  END IF;

  IF coalesce(p_message_type, 'text') = 'attachment' THEN
    BEGIN
      v_json := v_body::jsonb;
      RETURN coalesce(
        nullif(trim(v_json ->> 'preview_label'), ''),
        CASE v_json ->> 'attachment_kind'
          WHEN 'size_sheet' THEN 'Size sheet'
          WHEN 'link' THEN coalesce(nullif(trim(v_json ->> 'title'), ''), 'Link')
          ELSE 'Attachment'
        END
      );
    EXCEPTION
      WHEN others THEN
        RETURN 'Attachment';
    END;
  END IF;

  IF length(v_body) > 140 THEN
    RETURN left(v_body, 137) || '...';
  END IF;

  RETURN v_body;
END;
$$;
