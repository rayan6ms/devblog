import { z } from "zod";

const MAX_PASSWORD_LENGTH = 128;

const emailSchema = z
	.string()
	.trim()
	.min(1, "Email is required.")
	.email("Enter a valid email address.");

export const passwordSchema = z
	.string()
	.max(
		MAX_PASSWORD_LENGTH,
		`Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
	)
	.superRefine((value, ctx) => {
		if (value.length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Password is required.",
			});
			return;
		}

		if (value.length < 8) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Password must be at least 8 characters.",
			});
		}
	});

export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

export const registerPayloadSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, "Name must be at least 2 characters.")
		.max(60, "Name must be 60 characters or fewer."),
	email: emailSchema,
	password: passwordSchema,
});

export const registerFormSchema = registerPayloadSchema
	.extend({
		confirmPassword: z.string().min(1, "Please confirm your password."),
	})
	.superRefine(({ password, confirmPassword }, ctx) => {
		if (confirmPassword.length > 0 && password !== confirmPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Passwords do not match.",
				path: ["confirmPassword"],
			});
		}
	});

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
) {
	const errors: Partial<Record<keyof PasswordUpdateValues, string>> = {};
	const isTryingToUpdatePassword = Object.values(values).some(
		(value) => value.length > 0,
	);

	if (!isTryingToUpdatePassword) {
		return errors;
	}

	if (options.requireCurrentPassword && values.currentPassword.length === 0) {
		errors.currentPassword = "Current password is required.";
	}

	if (values.newPassword.length === 0) {
		errors.newPassword = "New password is required.";
	} else {
		const parsedPassword = passwordSchema.safeParse(values.newPassword);
		if (!parsedPassword.success) {
			errors.newPassword = parsedPassword.error.issues[0]?.message;
		}
	}

	if (values.confirmPassword.length === 0) {
		errors.confirmPassword = "Please confirm your new password.";
	} else if (values.newPassword !== values.confirmPassword) {
		errors.confirmPassword = "Passwords do not match.";
	}

	return errors;
}
