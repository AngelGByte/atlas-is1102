-- CP-08: verify the data set used by GET /api/empresas/1/clients.
SELECT COUNT(*) AS client_count
FROM clients;

SELECT COUNT(*) AS empresa_client_count
FROM clients
WHERE empresa_id = 1;
