import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Hash fixo usado quando o e-mail não existe, para que a resposta leve o mesmo
// tempo e não revele quais e-mails têm conta (enumeração).
let dummyHash: Promise<string> | null = null;
export function dummyVerify(plain: string): Promise<boolean> {
  dummyHash ??= bcrypt.hash("bellaagenda-dummy-password", COST);
  return dummyHash.then((h) => bcrypt.compare(plain, h)).then(() => false);
}
