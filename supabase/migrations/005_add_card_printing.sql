-- Add a nullable `printing` column to cards for the card's printing / sub-type
-- (e.g. Holofoil, Reverse Holofoil, 1st Edition, Unlimited, Normal). Previously
-- this was baked into the title; it is now a first-class stored field so the UI
-- can show "condition • printing" and the title stays clean.

alter table cards add column if not exists printing text;
