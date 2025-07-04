import jwt, { JwtPayload } from 'jsonwebtoken';

export interface i_token {
    id: number;
    email: string;
    name: string;
    isAdmin: Boolean;
    twoFactorSecret: string | null;
    dfa: boolean;
}

export function getTokenData(token: any): i_token {
    const decode = jwt.decode(token) as JwtPayload;
    return(decode.data);
}