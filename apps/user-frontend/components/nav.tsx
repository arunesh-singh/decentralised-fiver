"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

export const Nav = () => {
  const { publicKey, signMessage } = useWallet();
  const token = localStorage.getItem("token") || null;
  const [status, setStatus] = useState(token ? true : false);

  useEffect(() => {
    const signAndSend = async () => {
      const message = new TextEncoder().encode(`Sign in on ClickPulse`);
      const signature = await signMessage?.(message);

      try {
        const res = await axios.post("http://localhost:5000/v1/user/signin", {
          publicKey: publicKey?.toString(),
          signature: signature,
        });
        if (res.status === 200) {
          setStatus(true);
        } else {
          setStatus(false);
        }
        localStorage.setItem("token", res.data.token);
        console.log("Signed in successfully!");
      } catch (error) {
        setStatus(false);
        console.error("Error signing in:", error);
      }
    };
    if (publicKey) signAndSend();
  }, [publicKey]);
  return (
    <nav className="sticky w-full shadow-md flex items-center justify-between bg-white  px-10 rounded-full gradient-blue">
      <h1 className="text-4xl font-bold text-center p-4 text-black select-none">
        ClickPulse
      </h1>
      <WalletMultiButton
        style={{
          borderRadius: 25,
          paddingLeft: 40,
          paddingRight: 40,
        }}
        className="gradient-pink"
      />
      {/* <Button className="gradient-pink text-black border-none h-12 text-lg px-10">
          {status ? "Connected" : "Connect Wallet"}
        </Button> */}
    </nav>
  );
};
