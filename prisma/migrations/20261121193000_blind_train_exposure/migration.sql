-- Existing rows and requests from older clients represent revealed exercises.
ALTER TABLE blind_train_log ADD COLUMN completed BOOLEAN NOT NULL DEFAULT TRUE;
