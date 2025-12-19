import { STATIC_IMAGES_URL } from "@slice/data/constants";

interface WalletDetails {
  logo: string;
  name: string;
}

const WALLETS = {
  injected: {
    logo: `${STATIC_IMAGES_URL}/wallets/wallet.svg`,
    name: "Browser Wallet"
  }
} as const;

type WalletId = keyof typeof WALLETS;

const getWalletDetails = (id: WalletId): WalletDetails => {
  return WALLETS[id];
};

export default getWalletDetails;
