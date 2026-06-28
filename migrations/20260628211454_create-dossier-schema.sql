-- pepl per-user dossier schema. One dossier per user_id; re-run replaces.

CREATE TABLE IF NOT EXISTS public.dossiers (
  user_id text PRIMARY KEY,
  owner_name text,
  owner_email text,
  kind text,
  verdict jsonb,
  seeded_wrong jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.signals (
  user_id text,
  signal_id text,
  text text,
  source text,
  PRIMARY KEY (user_id, signal_id)
);

CREATE TABLE IF NOT EXISTS public.people (
  user_id text,
  person_id text,
  name text,
  ring int,
  closeness real,
  last_interaction text,
  PRIMARY KEY (user_id, person_id)
);

CREATE TABLE IF NOT EXISTS public.edges (
  user_id text,
  from_id text,
  to_id text,
  kind text,
  strength real
);

CREATE TABLE IF NOT EXISTS public.stories (
  user_id text,
  kind text,
  text text,
  grounded_in jsonb
);

CREATE TABLE IF NOT EXISTS public.cards (
  user_id text,
  kind text,
  payload jsonb
);

CREATE INDEX IF NOT EXISTS edges_user_id_idx ON public.edges (user_id);
CREATE INDEX IF NOT EXISTS stories_user_id_idx ON public.stories (user_id);
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON public.cards (user_id);
