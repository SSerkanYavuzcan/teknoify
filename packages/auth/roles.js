export const ROLE_TYPES = Object.freeze({
    admin: 'admin',
    premium: 'premium',
    member: 'member'
});

export const ROLE_STATUSES = Object.freeze({
    active: 'active',
    inactive: 'inactive',
    suspended: 'suspended'
});

export const DEFAULT_ROLE_TYPE = ROLE_TYPES.member;
export const DEFAULT_ROLE_STATUS = ROLE_STATUSES.active;

export const DASHBOARD_ACCESS_ROLES = Object.freeze({
    adminOnly: Object.freeze([ROLE_TYPES.admin]),
    premiumOrAdmin: Object.freeze([ROLE_TYPES.premium, ROLE_TYPES.admin]),
    authenticated: Object.freeze([ROLE_TYPES.member, ROLE_TYPES.premium, ROLE_TYPES.admin])
});

export function normalizeRoleType(roleType) {
    if (roleType === ROLE_TYPES.admin) return ROLE_TYPES.admin;
    if (roleType === ROLE_TYPES.premium) return ROLE_TYPES.premium;
    return ROLE_TYPES.member;
}

export function getRoleTypeFromRole(role) {
    if (typeof role === 'string') return normalizeRoleType(role);
    if (role && typeof role === 'object') return normalizeRoleType(role.type);
    return DEFAULT_ROLE_TYPE;
}

export function isAdminRole(role) {
    return getRoleTypeFromRole(role) === ROLE_TYPES.admin;
}

export function isPremiumRole(role) {
    return getRoleTypeFromRole(role) === ROLE_TYPES.premium;
}

export function isMemberRole(role) {
    return getRoleTypeFromRole(role) === ROLE_TYPES.member;
}

export function isRoleAllowed(role, allowedRoles = []) {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
    return allowedRoles.includes(getRoleTypeFromRole(role));
}
