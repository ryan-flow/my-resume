import type { Locale } from "@reactive-resume/utils/locale";
import type { User } from "better-auth";
import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { auth, verifyOAuthToken } from "@reactive-resume/auth/config";
import { db } from "@reactive-resume/db/client";
import { user } from "@reactive-resume/db/schema";

interface ORPCContext {
	locale: Locale;
	reqHeaders: Headers;
	resHeaders?: Headers;
}

// --- Single-user mode: guest user ID ---
const GUEST_USER_ID = "guest-wz-001";

async function getOrCreateGuestUser(): Promise<User> {
	const [existing] = await db.select().from(user).where(eq(user.id, GUEST_USER_ID)).limit(1);
	if (existing) return existing;

	const [created] = await db
		.insert(user)
		.values({
			id: GUEST_USER_ID,
			name: "王子轩",
			email: "wangzixuan@local.host",
			emailVerified: true,
			username: "wangzixuan",
			displayUsername: "wangzixuan",
		})
		.returning();
	return created;
}

async function getUserFromBearerToken(headers: Headers): Promise<User | null> {
	try {
		const authHeader = headers.get("authorization");
		if (!authHeader?.startsWith("Bearer ")) return null;

		const payload = await verifyOAuthToken(authHeader.slice(7));
		if (!payload?.sub) return null;

		const [userResult] = await db.select().from(user).where(eq(user.id, payload.sub)).limit(1);
		return userResult ?? null;
	} catch (_error) {
		return null;
	}
}

async function getUserFromHeaders(headers: Headers): Promise<User | null> {
	try {
		const result = await auth.api.getSession({ headers });
		if (!result?.user) return null;
		return result.user;
	} catch (_error) {
		return null;
	}
}

async function getUserFromApiKey(apiKey: string): Promise<User | null> {
	try {
		const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
		if (!result.key || !result.valid) return null;
		const [userResult] = await db.select().from(user).where(eq(user.id, result.key.referenceId)).limit(1);
		return userResult ?? null;
	} catch (_error) {
		return null;
	}
}

export async function resolveUserFromRequestHeaders(headers: Headers): Promise<User | null> {
	const apiKey = headers.get("x-api-key");
	if (apiKey) {
		const apiKeyUser = await getUserFromApiKey(apiKey);
		if (apiKeyUser) return apiKeyUser;
	} else {
		const bearerUser = await getUserFromBearerToken(headers);
		if (bearerUser) return bearerUser;
	}
	return getUserFromHeaders(headers);
}

const base = os.$context<ORPCContext>();

export const publicProcedure = base.use(async ({ context, next }) => {
	let user = await resolveUserFromRequestHeaders(context.reqHeaders);

	// Single-user mode: if no auth found, fall back to guest user
	if (!user) {
		user = await getOrCreateGuestUser();
	}

	return next({ context: { ...context, user } });
});

export const protectedProcedure = publicProcedure.use(async ({ context, next }) => {
	if (!context.user) throw new ORPCError("UNAUTHORIZED");
	return next({ context: { ...context, user: context.user } });
});
