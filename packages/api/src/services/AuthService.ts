import {prisma} from '../database/prisma';
import {verifyHash} from '../util/hash';

export class AuthService {
  public static async verifyCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!user?.password) {
      return false;
    }

    return await verifyHash(password, user.password);
  }
}
