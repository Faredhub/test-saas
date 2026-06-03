-- Civil industry templates (and most others) historically wrote
-- settings.modules without "office", which caused the entire Office
-- category (Documents, Spreadsheets, Presentations, Email, Messaging,
-- Calls) to disappear from the sidebar after applyIndustryTemplate ran.
--
-- The template JSON has now been corrected and applyIndustryTemplate
-- merges modules instead of overwriting, but existing tenants whose
-- settings already had "office" stripped still need a one-time patch.
--
-- This migration appends "office" to settings.modules for any tenant
-- whose modules list does not already include it. Handles both shapes
-- the column has been written in:
--   1) array: settings.modules = ["dashboard", "sales", ...]
--   2) object: settings.modules = {"dashboard": true, "sales": true, ...}
-- Tenants with a missing/null modules key are left untouched (the
-- sidebar treats null as "show all defaults" already).

-- Case 1: modules is a JSON array missing "office"
UPDATE "tenants"
SET settings = jsonb_set(
  settings::jsonb,
  '{modules}',
  (settings->'modules')::jsonb || '["office"]'::jsonb,
  true
)
WHERE settings IS NOT NULL
  AND jsonb_typeof((settings::jsonb)->'modules') = 'array'
  AND NOT ((settings::jsonb)->'modules' ? 'office');

-- Case 2: modules is a JSON object missing an "office" key set to true
UPDATE "tenants"
SET settings = jsonb_set(
  settings::jsonb,
  '{modules,office}',
  'true'::jsonb,
  true
)
WHERE settings IS NOT NULL
  AND jsonb_typeof((settings::jsonb)->'modules') = 'object'
  AND COALESCE(((settings::jsonb)->'modules'->>'office')::boolean, false) = false;
