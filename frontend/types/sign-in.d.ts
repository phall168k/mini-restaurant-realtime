import type { IToken } from "./token";
import type { IUser } from "./user";

export interface ISignIn {
    username: string;
    password: string;
}

export interface ISignInResponse {
    payload: {
        users: IUser;
        token: IToken;
    }
}