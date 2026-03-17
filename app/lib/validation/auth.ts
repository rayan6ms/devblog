import { z } from "zod";
import { DEFAULT_LOCALE, getMessages } from "@/lib/i18n";

const MAX_PASSWORD_LENGTH = 128;

export type AuthValidationMessages = ReturnType<
	typeof getMessages
>["authValidation"];

function createEmailSchema(messages: AuthValidationMessages) {
	return z
		.string()
		.trim()
		.min(1, messages.emailRequired)
		.email(messages.emailInvalid);
}

export function createPasswordSchema(messages: AuthValidationMessages) {
	return z
		.string()
		.max(MAX_PASSWORD_LENGTH, messages.passwordTooLong(MAX_PASSWORD_LENGTH))
		.superRefine((value, ctx) => {
			if (value.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: messages.passwordRequired,
				});
				return;
			}

			if (value.length < 8) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: messages.passwordTooShort,
				});
			}
		});
}

export function createLoginSchema(messages: AuthValidationMessages) {
	return z.object({
		email: createEmailSchema(messages),
		password: createPasswordSchema(messages),
	});
}

export function createRegisterPayloadSchema(messages: AuthValidationMessages) {
	return z.object({
		name: z
			.string()
			.trim()
			.min(2, messages.nameTooShort)
			.max(60, messages.nameTooLong),
		email: createEmailSchema(messages),
		password: createPasswordSchema(messages),
	});
}

export function createRegisterFormSchema(messages: AuthValidationMessages) {
	return createRegisterPayloadSchema(messages)
		.extend({
			confirmPassword: z.string().min(1, messages.confirmPasswordRequired),
		})
		.superRefine(({ password, confirmPassword }, ctx) => {
			if (confirmPassword.length > 0 && password !== confirmPassword) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: messages.passwordsDoNotMatch,
					path: ["confirmPassword"],
				});
			}
		});
}

const defaultAuthMessages = getMessages(DEFAULT_LOCALE).authValidation;

export const passwordSchema = createPasswordSchema(defaultAuthMessages);
export const loginSchema = createLoginSchema(defaultAuthMessages);
export const registerPayloadSchema =
	createRegisterPayloadSchema(defaultAuthMessages);
export const registerFormSchema = createRegisterFormSchema(defaultAuthMessages);

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type RegisterPayloadValues = z.infer<typeof registerPayloadSchema>;

export type PasswordUpdateValues = {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
};

export function getPasswordUpdateErrors(
	values: PasswordUpdateValues,
	options: {
		requireCurrentPassword: boolean;
	},
	messages: AuthValidationMessages = defaultAuthMessages,
) {
	const errors: Partial<Record<keyof PasswordUpdateValues, string>> = {};
	const isTryingToUpdatePassword = Object.values(values).some(
		(value) => value.length > 0,
	);

	if (!isTryingToUpdatePassword) {
		return errors;
	}

	if (options.requireCurrentPassword && values.currentPassword.length === 0) {
		errors.currentPassword = messages.currentPasswordRequired;
	}

	if (values.newPassword.length === 0) {
		errors.newPassword = messages.newPasswordRequired;
	} else {
		const parsedPassword = createPasswordSchema(messages).safeParse(
			values.newPassword,
		);
		if (!parsedPassword.success) {
			errors.newPassword = parsedPassword.error.issues[0]?.message;
		}
	}

	if (values.confirmPassword.length === 0) {
		errors.confirmPassword = messages.confirmNewPasswordRequired;
	} else if (values.newPassword !== values.confirmPassword) {
		errors.confirmPassword = messages.passwordsDoNotMatch;
	}

	return errors;
}
