-- Add images column to posts table for storing multiple image URLs as JSON
ALTER TABLE posts ADD COLUMN images TEXT;
