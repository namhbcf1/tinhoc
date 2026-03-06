import { jwtVerify, SignJWT } from "jose";

export interface UserPayload {
	id: number;
	phone: string;
	role: "super_admin" | "admin" | "teacher" | "student";
	name: string;
}

const getSecretKey = () => {
	const secret = process.env.JWT_SECRET || "vantrangedu-secret-key-development";
	return new TextEncoder().encode(secret);
};

export const signToken = async (payload: UserPayload): Promise<string> => {
	return await new SignJWT({ ...payload })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("7d") // Token sống 7 ngày
		.sign(getSecretKey());
};

export const verifyToken = async (
	token: string,
): Promise<UserPayload | null> => {
	try {
		const { payload } = await jwtVerify(token, getSecretKey());
		return payload as unknown as UserPayload;
	} catch (error) {
		return null;
	}
};
