import type { Locale } from "@/lib/i18n";

type AdminCopy = {
	navLabel: string;
	pageEyebrow: string;
	pageTitle: string;
	pageDescription: string;
	ownerTitle: string;
	ownerDescription: string;
	accessEyebrow: string;
	accessTitle: string;
	accessDescription: string;
	loginCta: string;
	statsUsers: string;
	statsRole: string;
	searchLabel: string;
	searchPlaceholder: string;
	searchEmpty: string;
	tableTitle: string;
	tableDescription: string;
	nameLabel: string;
	emailLabel: string;
	handleLabel: string;
	roleLabel: string;
	joinedLabel: string;
	statusLabel: string;
	actionsLabel: string;
	saveRole: string;
	savingRole: string;
	saveSuccess: string;
	saveError: string;
	selfProtected: string;
	ownerProtected: string;
	ownerEmailProtected: string;
	adminScopeProtected: string;
	noEmail: string;
	noHandle: string;
	ownerEmailBadge: string;
};

const en: AdminCopy = {
	navLabel: "Admin",
	pageEyebrow: "Admin controls",
	pageTitle: "Manage user roles",
	pageDescription:
		"Review registered users, promote trusted authors, and keep sensitive permissions in one guarded place.",
	ownerTitle: "Owner bootstrap",
	ownerDescription:
		"Set OWNER_EMAIL in your .env. That account becomes owner when it registers or signs in, and can promote the first admin from this page.",
	accessEyebrow: "Restricted area",
	accessTitle: "Admin access required",
	accessDescription:
		"Only admins and owners can manage user roles from this page.",
	loginCta: "Go to login",
	statsUsers: "Users",
	statsRole: "Your role",
	searchLabel: "Search users",
	searchPlaceholder: "Filter by name, email, or handle",
	searchEmpty: "No users match this filter.",
	tableTitle: "User directory",
	tableDescription:
		"Role changes apply immediately. Admins can only manage lower roles, and the account tied to OWNER_EMAIL stays owner until you change that env value.",
	nameLabel: "Name",
	emailLabel: "Email",
	handleLabel: "Handle",
	roleLabel: "Role",
	joinedLabel: "Joined",
	statusLabel: "Status",
	actionsLabel: "Actions",
	saveRole: "Save role",
	savingRole: "Saving...",
	saveSuccess: "Role updated.",
	saveError: "Unable to update this user right now.",
	selfProtected: "Your account",
	ownerProtected: "Owner account",
	ownerEmailProtected: "Remove from OWNER_EMAIL first",
	adminScopeProtected: "Admins can only manage lower roles",
	noEmail: "No email",
	noHandle: "No handle",
	ownerEmailBadge: "Owner email",
};

const ptBR: AdminCopy = {
	navLabel: "Admin",
	pageEyebrow: "Controles administrativos",
	pageTitle: "Gerenciar papéis dos usuários",
	pageDescription:
		"Revise usuários cadastrados, promova autores confiáveis e mantenha permissões sensíveis em uma área protegida.",
	ownerTitle: "Bootstrap do owner",
	ownerDescription:
		"Defina OWNER_EMAIL no seu .env. Essa conta vira owner quando se registra ou faz login, e pode promover o primeiro admin nesta página.",
	accessEyebrow: "Área restrita",
	accessTitle: "Acesso de admin necessário",
	accessDescription:
		"Apenas admins e owners podem gerenciar papéis de usuários nesta página.",
	loginCta: "Ir para login",
	statsUsers: "Usuários",
	statsRole: "Seu papel",
	searchLabel: "Buscar usuários",
	searchPlaceholder: "Filtrar por nome, email ou handle",
	searchEmpty: "Nenhum usuário corresponde a esse filtro.",
	tableTitle: "Diretório de usuários",
	tableDescription:
		"As mudanças de papel se aplicam imediatamente. Admins só podem gerenciar papéis inferiores, e a conta ligada a OWNER_EMAIL continua owner até você mudar esse valor no env.",
	nameLabel: "Nome",
	emailLabel: "Email",
	handleLabel: "Handle",
	roleLabel: "Papel",
	joinedLabel: "Entrou em",
	statusLabel: "Status",
	actionsLabel: "Ações",
	saveRole: "Salvar papel",
	savingRole: "Salvando...",
	saveSuccess: "Papel atualizado.",
	saveError: "Não foi possível atualizar este usuário agora.",
	selfProtected: "Sua conta",
	ownerProtected: "Conta owner",
	ownerEmailProtected: "Remova do OWNER_EMAIL primeiro",
	adminScopeProtected: "Admins só podem gerenciar papéis inferiores",
	noEmail: "Sem email",
	noHandle: "Sem handle",
	ownerEmailBadge: "Email do owner",
};

const es: AdminCopy = {
	navLabel: "Admin",
	pageEyebrow: "Controles de admin",
	pageTitle: "Gestionar roles de usuarios",
	pageDescription:
		"Revisa usuarios registrados, promueve autores de confianza y mantén los permisos sensibles en un solo lugar protegido.",
	ownerTitle: "Bootstrap del owner",
	ownerDescription:
		"Configura OWNER_EMAIL en tu .env. Esa cuenta se convierte en owner cuando se registra o inicia sesión, y puede promover al primer admin desde esta página.",
	accessEyebrow: "Área restringida",
	accessTitle: "Se requiere acceso admin",
	accessDescription:
		"Solo los admins y owners pueden gestionar roles de usuario desde esta página.",
	loginCta: "Ir al login",
	statsUsers: "Usuarios",
	statsRole: "Tu rol",
	searchLabel: "Buscar usuarios",
	searchPlaceholder: "Filtra por nombre, correo o handle",
	searchEmpty: "Ningún usuario coincide con este filtro.",
	tableTitle: "Directorio de usuarios",
	tableDescription:
		"Los cambios de rol se aplican de inmediato. Los admins solo pueden gestionar roles inferiores, y la cuenta ligada a OWNER_EMAIL sigue siendo owner hasta que cambies ese valor en el env.",
	nameLabel: "Nombre",
	emailLabel: "Correo",
	handleLabel: "Handle",
	roleLabel: "Rol",
	joinedLabel: "Se unió",
	statusLabel: "Estado",
	actionsLabel: "Acciones",
	saveRole: "Guardar rol",
	savingRole: "Guardando...",
	saveSuccess: "Rol actualizado.",
	saveError: "No se pudo actualizar este usuario ahora.",
	selfProtected: "Tu cuenta",
	ownerProtected: "Cuenta owner",
	ownerEmailProtected: "Primero quítalo de OWNER_EMAIL",
	adminScopeProtected: "Los admins solo pueden gestionar roles inferiores",
	noEmail: "Sin correo",
	noHandle: "Sin handle",
	ownerEmailBadge: "Correo del owner",
};

const copyByLocale: Record<Locale, AdminCopy> = {
	en,
	"pt-BR": ptBR,
	es,
	de: en,
	ru: en,
	fr: en,
	ja: en,
};

export type { AdminCopy };

export function getAdminCopy(locale: Locale) {
	return copyByLocale[locale] || en;
}
