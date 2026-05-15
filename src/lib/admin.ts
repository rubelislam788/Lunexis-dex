export const ADMIN_WALLET_ADDRESS = "0x01176d7052A51471a43E01A467fC572a8e23260c".toLowerCase();

export function isAdminWallet(address?: string) {
  return Boolean(address && address.toLowerCase() === ADMIN_WALLET_ADDRESS);
}
