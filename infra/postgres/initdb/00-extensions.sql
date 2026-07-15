\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS age;

LOAD 'age';
SET search_path = ag_catalog, "$user", public;
ALTER DATABASE kiduna SET search_path = public, ag_catalog, "$user";

SELECT create_graph('kiduna')
WHERE NOT EXISTS (
  SELECT 1 FROM ag_catalog.ag_graph WHERE name = 'kiduna'
);
