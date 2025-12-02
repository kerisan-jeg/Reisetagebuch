export type UserProfile = {
	name: string;
	[key: string]: any;
};

export type AuthUser = { id: string; name: string; avatarUrl?: string };
