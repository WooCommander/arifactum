-- Price Verifications: users confirm or deny that a price is still current
CREATE TABLE price_verifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    price_id    uuid NOT NULL REFERENCES prices(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote        text NOT NULL CHECK (vote IN ('confirm', 'deny')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (price_id, user_id)
);

CREATE INDEX idx_price_verifications_price_id ON price_verifications(price_id);

ALTER TABLE price_verifications ENABLE ROW LEVEL SECURITY;

-- Anyone can read vote counts (needed for display without auth)
CREATE POLICY "public read verifications"
    ON price_verifications FOR SELECT USING (true);

-- Authenticated users can manage only their own vote
CREATE POLICY "user manages own vote insert"
    ON price_verifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user manages own vote update"
    ON price_verifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "user manages own vote delete"
    ON price_verifications FOR DELETE
    USING (auth.uid() = user_id);
