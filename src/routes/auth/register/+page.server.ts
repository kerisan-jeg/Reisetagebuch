import { redirect } from "@sveltejs/kit";

export const load = () => {
	// Alte Register-Seite unter /auth/register → weiterleiten auf neue Register-Seite
	throw redirect(307, "/register");
};
