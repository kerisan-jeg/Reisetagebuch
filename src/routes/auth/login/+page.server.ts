import { redirect } from "@sveltejs/kit";

export const load = () => {
	// Alte Login-Seite unter /auth/login → weiterleiten auf neue Login-Seite
	throw redirect(307, "/login");
};
