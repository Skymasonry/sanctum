-- Live collaborative documents live inside the file_nodes tree so they
-- browse/rename/delete like any other node. A doc is a file_node with
-- mime = 'application/vnd.sanctum.doc' and storage_key = 'doc'; its
-- editable state is the corresponding row in doc_states below.

BEGIN;

CREATE TABLE doc_states (
    file_node_id UUID PRIMARY KEY REFERENCES file_nodes(id) ON DELETE CASCADE,
    y_state BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
