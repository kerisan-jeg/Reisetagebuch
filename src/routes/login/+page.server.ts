import { redirect, type Load } from "@sveltejs/kit";

// Keep the old /login entrypoint working by forwarding to "/" while preserving query params
export const load: Load = ({ url }) => {
	const target = "/" + (url.search ?? "");
	throw redirect(307, target);
};
