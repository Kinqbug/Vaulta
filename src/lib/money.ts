import { z } from 'zod';

/** Money is stored as integer cents and exposed to the client as dollars. */
export const toCents = (dollars: number) => Math.round(dollars * 100);
export const toDollars = (cents: number) => cents / 100;

/** A positive dollar amount with at most two decimals. */
export const amountSchema = (max: number) =>
  z
    .number({ error: 'Enter a valid amount.' })
    .positive('Enter an amount greater than zero.')
    .max(max, `Amount can't be more than $${max.toLocaleString('en-US')}.`)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Use at most two decimal places.');
