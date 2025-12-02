import { redirect } from "@sveltejs/kit";
import { supabase } from "$lib/supabaseClient";

export const load = async () => {
	await supabase.auth.signOut();
	throw redirect(303, "/login");
};
