-- The user's drawn card (Part 4): smiley avatar + picked colors + chosen card gradient.
-- One row per user_id (idempotent upsert). Kept OUT of dossiers on purpose: saveDossier()
-- deletes+reinserts the dossiers row on every re-run, and the card is drawn BEFORE the scrape
-- exists, so it must survive independently. smiley is text (svg/data-url); colors+gradient are
-- jsonb so any front-end shape round-trips losslessly (no silent coercion).
create table if not exists public.user_cards (
  user_id text primary key,
  smiley text not null,
  smiley_colors jsonb,
  card_gradient jsonb,
  created_at timestamptz not null default now()
);
