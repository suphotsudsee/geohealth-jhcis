export type Permission =
  | 'patient:read' | 'patient:write'
  | 'house:read' | 'house:write'
  | 'ffc:read' | 'ffc:write'
  | 'analytics:read'
  | 'reports:create'
  | 'admin:users' | 'admin:sync' | 'admin:settings'

type Role = 'ADMIN' | 'DISTRICT' | 'HOSPITAL' | 'FFC' | 'VIEWER'

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: ['patient:read','patient:write','house:read','house:write','ffc:read','ffc:write','analytics:read','reports:create','admin:users','admin:sync','admin:settings'],
  DISTRICT: ['patient:read','patient:write','house:read','house:write','ffc:read','ffc:write','analytics:read','reports:create'],
  HOSPITAL: ['patient:read','patient:write','house:read','house:write','ffc:read','ffc:write','analytics:read','reports:create'],
  FFC: ['patient:read','house:read','ffc:read','ffc:write'],
  VIEWER: ['patient:read','house:read','ffc:read','analytics:read'],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function getScopeFilter(role: Role, villageCode?: string | null, districtCode?: string | null) {
  if (role === 'ADMIN') return {}
  if (role === 'DISTRICT' && districtCode) return { districtCode }
  if (villageCode) return { villageCode }
  return {}
}
