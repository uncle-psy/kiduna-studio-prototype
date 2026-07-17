/**
 * Solana integration — barrel export.
 */
export {
  getConnection,
  getEnvironment,
  getUsdcMint,
  isLocal,
  makeAnchorProvider,
  makeReadOnlyProvider,
  getVaultSolBalance,
  DECIMALS,
} from "./connection";

export {
  generateAgentKeypair,
  decryptAgentKeypair,
  loadSystemKeypair,
  getSystemPublicKey,
  isValidPublicKey,
  type AgentKeypairResult,
} from "./keypairs";

export {
  serializeUnsignedTx,
  deserializeSignedTx,
  submitSignedTx,
  getRecentBlockhash,
  setRecentBlockhash,
  isConfirmed,
} from "./transactions";

export {
  buildLaunchStep,
  type LaunchContext,
  type StepResult,
  type PreviousStepAddresses,
} from "./build-launch-tx";

export {
  loadFaucetKeypair,
  resolveFaucetUsdcMint,
  isFaucetAllowed,
  airdropSol,
  mintUsdc,
  type AirdropResult,
  type MintUsdcResult,
} from "./faucet";