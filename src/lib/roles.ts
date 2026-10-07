export const USER_ROLES = ['admin', 'teacher', 'educator', 'student'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.some((role) => role === value);
}
