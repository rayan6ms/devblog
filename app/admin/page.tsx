import type { Role } from "@prisma/client";
import Footer from "@/components/Footer";
import prisma from "@/database/prisma";
import AdminRoleManager from "@/admin/AdminRoleManager";
import { getAdminCopy } from "@/admin/copy";
import type { AdminManagedUser } from "@/admin/types";
import { canManageUsers, isOwnerEmail } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { getRequestLocale } from "@/lib/request-locale";
import { withLocaleQuery } from "@/lib/i18n";
import { resolveUserRole } from "@/lib/user-profile";

function mapManagedUser(user: {
	id: string;
	name: string | null;
	email: string | null;
	username: string | null;
	slug: string | null;
	role: Role;
	createdAt: Date;
}): AdminManagedUser {
	return {
		id: user.id,
		name: user.name?.trim() || user.username?.trim() || user.slug?.trim() || "User",
		email: user.email,
		username: user.username,
		slug: user.slug,
		role: resolveUserRole(user.role),
		createdAt: user.createdAt.toISOString(),
		isOwnerEmail: isOwnerEmail(user.email),
	};
}

export default async function AdminPage() {
	const locale = await getRequestLocale();
	const copy = getAdminCopy(locale);
	const session = await auth();
	const isAuthorized = canManageUsers(session?.user?.role);

	if (!session?.user?.id || !isAuthorized) {
		return (
			<>
				<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
						<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-10 shadow-xl shadow-zinc-950/20 sm:px-8">
							<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
								{copy.accessEyebrow}
							</p>
							<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
								{copy.accessTitle}
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
								{copy.accessDescription}
							</p>
							{!session?.user?.id ? (
								<a
									href={withLocaleQuery("/login", locale)}
									className="mt-6 inline-flex rounded-full border border-zinc-700/60 bg-greyBg/75 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-zinc-500/70 hover:text-wheat"
								>
									{copy.loginCta}
								</a>
							) : null}
						</section>
					</div>
				</main>
				<Footer />
			</>
		);
	}

	const users = await prisma.user.findMany({
		select: {
			id: true,
			name: true,
			email: true,
			username: true,
			slug: true,
			role: true,
			createdAt: true,
		},
		orderBy: [{ createdAt: "desc" }],
	});
	const initialUsers = users.map(mapManagedUser);

	return (
		<>
			<main className="min-h-screen bg-darkBg px-4 pb-12 pt-6 text-gray sm:px-6 lg:px-8">
				<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8">
					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-8 shadow-xl shadow-zinc-950/20 sm:px-8">
						<div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-end">
							<div>
								<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
									{copy.pageEyebrow}
								</p>
								<h1 className="mt-3 text-4xl font-somerton text-wheat sm:text-5xl">
									{copy.pageTitle}
								</h1>
								<p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
									{copy.pageDescription}
								</p>
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<div className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3">
									<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
										{copy.statsUsers}
									</p>
									<p className="mt-1 text-lg font-semibold text-zinc-100">
										{initialUsers.length}
									</p>
								</div>
								<div className="rounded-2xl border border-zinc-700/60 bg-greyBg/70 px-4 py-3">
									<p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
										{copy.statsRole}
									</p>
									<p className="mt-1 text-lg font-semibold capitalize text-zinc-100">
										{session.user.role}
									</p>
								</div>
							</div>
						</div>
					</section>

					<section className="rounded-[30px] border border-zinc-700/50 bg-lessDarkBg/90 px-6 py-6 shadow-xl shadow-zinc-950/20 sm:px-8">
						<p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
							{copy.ownerTitle}
						</p>
						<p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
							{copy.ownerDescription}
						</p>
					</section>

					<AdminRoleManager
						copy={copy}
						currentUserId={session.user.id}
						currentUserRole={resolveUserRole(session.user.role)}
						initialUsers={initialUsers}
						locale={locale}
					/>
				</div>
			</main>
			<Footer />
		</>
	);
}
