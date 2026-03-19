// @ts-nocheck
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error("DATABASE_URL is not set.");
}

function normalizePostgresSslMode(value: string) {
	try {
		const url = new URL(value);
		const sslMode = url.searchParams.get("sslmode");

		if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
			// Preserve the current stricter behavior explicitly to avoid pg's warning.
			url.searchParams.set("sslmode", "verify-full");
		}

		return url.toString();
	} catch {
		return value;
	}
}

const adapter = new PrismaPg({
	connectionString: normalizePostgresSslMode(connectionString),
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter,
		log: ["error"],
	});

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}

export default prisma;
