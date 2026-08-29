-- Data migration: strip the blanket read access that the original seed granted
-- to the default "Employee" and "Viewer" system roles. These roles are meant to
-- be RBAC-first (empty by default); admins assign explicit module/resource
-- permissions via the Roles UI. Only "read" permissions are removed — any
-- create/update/delete/export permissions an admin granted intentionally are kept.
DELETE FROM "role_permissions" rp
USING "roles" r
WHERE rp."roleId" = r."id"
  AND r."isSystem" = true
  AND r."name" IN ('Employee', 'Viewer')
  AND rp."permissionId" IN (
    SELECT "id" FROM "permissions" WHERE "action" = 'read'
  );
