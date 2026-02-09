import { Role } from "@prisma/client";

/**
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */
const ROLE_HIERARCHY: Role[] = ["VIEWER", "OPERATOR", "ADMIN"];

/**
 * Check if a user role has at least the required role level
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
    const userIndex = ROLE_HIERARCHY.indexOf(userRole);
    const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
    return userIndex >= requiredIndex;
}

/**
 * Check if user can perform CRUD operations
 */
export function canCreate(role: Role): boolean {
    return hasRole(role, "OPERATOR");
}

export function canRead(role: Role): boolean {
    return hasRole(role, "VIEWER");
}

export function canUpdate(role: Role): boolean {
    return hasRole(role, "OPERATOR");
}

export function canDelete(role: Role): boolean {
    return hasRole(role, "ADMIN");
}

export function canManageUsers(role: Role): boolean {
    return hasRole(role, "ADMIN");
}

export function canExport(role: Role): boolean {
    return hasRole(role, "OPERATOR");
}

export function canImport(role: Role): boolean {
    return hasRole(role, "OPERATOR");
}

export function canMarkPaid(role: Role): boolean {
    return hasRole(role, "OPERATOR");
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: Role): string {
    const names: Record<Role, string> = {
        ADMIN: "Administrator",
        OPERATOR: "Operator",
        VIEWER: "Viewer",
    };
    return names[role];
}
