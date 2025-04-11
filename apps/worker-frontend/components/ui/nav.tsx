"use client";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

// Constants
const API_BASE_URL = "http://localhost:5000/v1";
const SIGN_MESSAGE = "Sign in on ClickPulse";

// Custom styles
const walletButtonStyles = {
  borderRadius: 25,
  paddingLeft: 40,
  paddingRight: 40,
};

interface AuthState {
  isAuthenticated: boolean;
  balance: string;
  isLoading: boolean;
}

export const Nav = () => {
  const { publicKey, signMessage } = useWallet();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    balance: "",
    isLoading: false,
  });
  const authAttempted = useRef(false);

  const handlePayout = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/worker/payout`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.status === 200) {
        const { amount } = response.data;
        setAuthState((prev) => ({ ...prev, balance: amount }));
      }
    } catch (error) {
      console.error("Payout failed:", error);
    }
  };
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setAuthState((prev) => ({ ...prev, isAuthenticated: true }));
    }
    const handleAuthentication = async () => {
      if (!publicKey || !signMessage || authAttempted.current) return;

      authAttempted.current = true;

      setAuthState((prev) => ({ ...prev, isLoading: true }));

      try {
        const message = new TextEncoder().encode(SIGN_MESSAGE);
        const signature = await signMessage(message);

        const response = await axios.post(`${API_BASE_URL}/worker/signin`, {
          publicKey: publicKey.toString(),
          signature,
        });

        if (response.status === 200) {
          const { token, amount } = response.data;

          console.log(token);
          localStorage.setItem("token", token);

          setAuthState({
            isAuthenticated: true,
            balance: amount,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error("Authentication failed:", error);
        setAuthState({
          isAuthenticated: false,
          balance: "",
          isLoading: false,
        });
      }
    };

    if (publicKey) {
      handleAuthentication();
    }
  }, [publicKey, signMessage]);

  return (
    <nav className="sticky w-full shadow-md flex items-center justify-between bg-white px-10 rounded-full gradient-blue">
      <Logo />
      <NavActions
        balance={authState.balance}
        isLoading={authState.isLoading}
        handlePayout={handlePayout}
      />
    </nav>
  );
};

const Logo = () => (
  <h1 className="text-4xl font-bold text-center p-4 text-black select-none">
    ClickPulse
  </h1>
);

interface NavActionsProps {
  balance: string;
  isLoading: boolean;
  handlePayout: () => void;
}

const NavActions = ({ balance, isLoading, handlePayout }: NavActionsProps) => (
  <div className="flex gap-4">
    <Button
      onClick={() => handlePayout()}
      className="gradient-pink text-black border-none h-12 text-lg px-10"
      disabled={isLoading}>
      {isLoading ? "Loading..." : `Payout ${balance} SOL`}
    </Button>
    <WalletMultiButton
      style={walletButtonStyles}
      className="gradient-pink"
      disabled={isLoading}
    />
  </div>
);
