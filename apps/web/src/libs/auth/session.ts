// SPA session lookup — single-user mode, no login required.
// Returns a hardcoded guest session so all routes are accessible without authentication.

import type { AuthSession } from "@reactive-resume/auth/types";

const GUEST_SESSION: AuthSession = {
	user: {
		id: "guest-wz-001",
		name: "王子轩",
		email: "wangzixuan@local.host",
		emailVerified: true,
		username: "wangzixuan",
		displayUsername: "wangzixuan",
		image: null,
		twoFactorEnabled: false,
		lastActiveAt: new Date(),
		role: "user",
		banned: false,
		banReason: null,
		banExpires: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	session: {
		id: "guest-session-persistent",
		userId: "guest-wz-001",
		expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
		token: "guest-token-persistent",
		ipAddress: "127.0.0.1",
		userAgent: "my-resume-single-user",
		createdAt: new Date(),
		updatedAt: new Date(),
	},
};

export const getSession = async (): Promise<AuthSession | null> => {
	return GUEST_SESSION;
};
