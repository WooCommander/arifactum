-- Add fields for Unit Price Comparison
alter table prices
add column quantity numeric,      -- Amount (e.g. 0.9, 900, 1.5)
add column quantity_unit text,    -- Unit of the amount (e.g. 'kg', 'l', 'g', 'ml', 'pcs')
add column normalized_price numeric; -- Price per 1 base unit (1 kg, 1 l)

-- Optional: Create a function to auto-calculate normalized_price if we wanted to enforce it at DB level,
-- but for now we'll calculate it in the application layer.
