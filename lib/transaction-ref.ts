import { randomInt } from "crypto";

const CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type IdPrefix = "TRX" | "MRX";

export type TransactionType =
  | "BIL"
  | "PAY"
  | "EXP"
  | "COM"
  | "ALO"
  | "ADJ";

export function generateId(
  prefix: IdPrefix,
  period: string,
  transactionType: TransactionType
): string {
  if (!/^(0[1-9]|1[0-2])\d{4}$/.test(period)) {
    throw new Error("Period must use MMYYYY format");
  }

  const random = Array.from(
    { length: 6 },
    () => CHARACTERS[randomInt(CHARACTERS.length)]
  ).join("");

  return `${prefix}${period}${transactionType}${random}`;
}