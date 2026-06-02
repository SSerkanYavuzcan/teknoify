import { getRoleTypeFromRole, ROLE_TYPES } from './roles.js';

export const ACCESS_LEVELS = Object.freeze({
    public: 'public',
    authenticated: 'authenticated',
    premium: 'premium',
    admin: 'admin'
});

export const DEFAULT_ACCESS_LEVEL = ACCESS_LEVELS.public;

export function normalizeAccessLevel(accessLevel) {
    if (accessLevel === ACCESS_LEVELS.admin) return ACCESS_LEVELS.admin;
    if (accessLevel === ACCESS_LEVELS.premium) return ACCESS_LEVELS.premium;
    if (accessLevel === ACCESS_LEVELS.authenticated) return ACCESS_LEVELS.authenticated;
    return DEFAULT_ACCESS_LEVEL;
}

export function hasPremiumAccess(role) {
    const roleType = getRoleTypeFromRole(role);
    return roleType === ROLE_TYPES.admin || roleType === ROLE_TYPES.premium;
}

export function hasAuthenticatedAccess(role) {
    return Boolean(getRoleTypeFromRole(role));
}

export function requiresPremiumAccess(requiredAccessLevel) {
    const accessLevel = normalizeAccessLevel(requiredAccessLevel);
    return accessLevel === ACCESS_LEVELS.premium || accessLevel === ACCESS_LEVELS.admin;
}

export function hasAccessLevel(role, requiredAccessLevel = ACCESS_LEVELS.public) {
    const accessLevel = normalizeAccessLevel(requiredAccessLevel);

    if (accessLevel === ACCESS_LEVELS.public) return true;
    if (accessLevel === ACCESS_LEVELS.authenticated) return hasAuthenticatedAccess(role);
    if (accessLevel === ACCESS_LEVELS.premium) return hasPremiumAccess(role);
    return getRoleTypeFromRole(role) === ROLE_TYPES.admin;
}
