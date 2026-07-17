/**
 * Re-export of the isomorphic priority-fee helper so server-side Solana
 * builders can keep importing from "./priority-fee". The single source of
 * truth (server + client) lives in lib/priority-fee.ts.
 */
export { getPriorityFee, getPriorityFeeForIxs } from "@/lib/priority-fee";
