interface RegisterData {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
}
interface LoginData {
    email: string;
    password: string;
}
export declare const registerUser: (data: RegisterData) => Promise<never>;
export declare const loginUser: (data: LoginData) => Promise<never>;
export declare const sendPasswordReset: (email: string) => Promise<never>;
export declare const verifyEmail: (token: string) => Promise<never>;
export declare const refreshAccessToken: (refreshToken: string) => Promise<never>;
export declare const getUserById: (userId: string) => Promise<never>;
export declare const logoutUser: (userId: string) => Promise<never>;
export {};
//# sourceMappingURL=auth.service.d.ts.map