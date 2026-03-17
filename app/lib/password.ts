import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const HASH_ALGORITHM = "scrypt";
const KEY_LENGTH = 64;

export function hashPassword(password: string) {
	const salt = randomBytes(16).toString("hex");
	const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
	return `${HASH_ALGORITHM}:${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
	if (!storedHash) {
		return false;
	}

	const [algorithm, salt, hash] = storedHash.split(":");
	if (algorithm !== HASH_ALGORITHM || !salt || !hash) {
		return false;
	}

	const derivedKey = scryptSync(password, salt, KEY_LENGTH);
	const hashBuffer = Buffer.from(hash, "hex");

	if (hashBuffer.length !== derivedKey.length) {
		return false;
	}

	return timingSafeEqual(hashBuffer, derivedKey);
}
