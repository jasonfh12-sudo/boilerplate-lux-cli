-- Add role_id column to user table
ALTER TABLE "system.interface_user" ADD COLUMN role_id TEXT;

-- Create roles table
CREATE TABLE "system.interface_roles" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  interface_id TEXT NOT NULL,
  is_default INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

-- Create page permissions table
CREATE TABLE "system.interface_page_permissions" (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES "system.interface_roles"(id) ON DELETE CASCADE,
  route_pattern TEXT NOT NULL,
  can_access INTEGER DEFAULT 1 NOT NULL,
  created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

-- Create data permissions table
CREATE TABLE "system.interface_data_permissions" (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES "system.interface_roles"(id) ON DELETE CASCADE,
  route_pattern TEXT NOT NULL,
  data_source_type TEXT NOT NULL,
  data_source_name TEXT NOT NULL,
  filter_config TEXT NOT NULL,
  created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_roles_interface ON "system.interface_roles"(interface_id);
CREATE INDEX idx_page_permissions_role ON "system.interface_page_permissions"(role_id);
CREATE INDEX idx_page_permissions_route ON "system.interface_page_permissions"(route_pattern);
CREATE INDEX idx_data_permissions_role ON "system.interface_data_permissions"(role_id);
CREATE INDEX idx_data_permissions_route ON "system.interface_data_permissions"(route_pattern);
CREATE INDEX idx_user_role ON "system.interface_user"(role_id);
