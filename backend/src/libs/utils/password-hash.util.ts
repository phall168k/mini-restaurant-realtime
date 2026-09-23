import * as bcrypt from 'bcrypt';

export class PasswordHash {
    public static async hash(plainText: string): Promise<string> {
        const passwordHash = await bcrypt.hash(plainText, 10);
        return passwordHash;
    }

    public static async verify(plainText: string, encryptText: string): Promise<boolean> {
        const isMatched = await bcrypt.compare(plainText, encryptText);
        return isMatched;
    }
}