-- Database initialization script
-- Run: psql -U postgres -f init.sql

CREATE DATABASE kmenu_ai;
CREATE USER kmenu WITH PASSWORD 'kmenu_secret';
GRANT ALL PRIVILEGES ON DATABASE kmenu_ai TO kmenu;
\c kmenu_ai
GRANT ALL ON SCHEMA public TO kmenu;
