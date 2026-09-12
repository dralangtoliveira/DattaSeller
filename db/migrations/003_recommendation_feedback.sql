BEGIN;

CREATE TABLE recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES users(id),
  useful boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recommendation_feedback_recommendation_idx
  ON recommendation_feedback(recommendation_id, created_at DESC);

COMMIT;
