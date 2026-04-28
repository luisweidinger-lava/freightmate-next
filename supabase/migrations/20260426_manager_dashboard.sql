-- Link cases to the operator who handled them.
ALTER TABLE shipment_cases
  ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_cases_operator_id ON shipment_cases (operator_id);

-- Store business-hours config per organisation.
-- Format: { "tz": "Europe/Berlin", "days": [9,18, 9,18, 9,18, 9,18, 9,18, null,null] }
-- days = pairs of [open_hour, close_hour] for Mon–Sun; null pair = closed that day.
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS office_hours jsonb;
