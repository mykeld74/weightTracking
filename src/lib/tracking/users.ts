import type { User } from 'better-auth';

export const userRoles = ['user', 'admin'] as const;

export type UserRole = (typeof userRoles)[number];

/** The Better Auth user plus the fields this app adds in `additionalFields`. */
export type AppUser = User & {
	role: UserRole;
	approvedAt: Date | null;
};

/** Account row as shown on the admin screen — no health data, ever. */
export type ManagedAccount = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	approvedAt: Date | null;
	createdAt: Date;
};

export function isAdmin(user: Pick<AppUser, 'role'> | undefined): boolean {
	return user?.role === 'admin';
}

export function isUserRole(value: string): value is UserRole {
	return (userRoles as readonly string[]).includes(value);
}
