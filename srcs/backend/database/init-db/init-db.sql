DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
   END IF;
END;
$$ LANGUAGE plpgsql;

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- VARCHAR(n) -> TEXT de taille max n

-- Droits sur la base (connexion + CREATE objets)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO ${DB_USER};

-- Droits sur les objets futurs (si le rôle ne les crée pas lui-même)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO ${DB_USER};

-- Droits sur les sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${DB_USER};
