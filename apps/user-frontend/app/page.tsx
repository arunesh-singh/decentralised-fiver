"use client";
import FileUploaderTest from "@/components/dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import axios from "axios";
import { useState } from "react";

export default function Home() {
  const { publicKey, sendTransaction } = useWallet();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { connection } = useConnection();

  const makePayment = async () => {
    setError("");
    if (!publicKey) {
      setError("Wallet not connected.");
      return;
    }
    if (loading) {
      return;
    }
    if (title === "") {
      setError("Title is required.");
      return;
    }
    if (uploaded.length < 2) {
      setError("Please upload at least 2 images.");
      return;
    }
    setLoading(true);

    let originalSignature: string | undefined;

    try {
      const transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey!,
          toPubkey: new PublicKey(
            "3UQyJMSTWq7isJZKh6h1PH9zrcykwwQMiMJ89VVksf86",
          ),
          lamports: 100000000,
        }),
      );

      const latestBlockhash = await connection.getLatestBlockhash("finalized");
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      originalSignature = await sendTransaction(transaction, connection);

      let confirmed = false;
      let retries = 5;

      while (!confirmed && retries > 0) {
        try {
          const status = await connection.getSignatureStatus(originalSignature);
          console.log("Transaction status:", status);

          if (
            status?.value?.confirmationStatus === "confirmed" ||
            status?.value?.confirmationStatus === "finalized"
          ) {
            confirmed = true;
            setTxSignature(originalSignature);
            setSuccess("Payment successful!");
            break;
          }

          retries--;
          if (retries === 0) {
            throw new Error("Transaction confirmation timeout");
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (err) {
          console.error("Confirmation attempt failed:", err);
          retries--;
          if (retries === 0) {
            throw new Error("Transaction confirmation timeout");
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (!confirmed && originalSignature) {
        try {
          const refundTransaction = new Transaction();
          refundTransaction.add(
            SystemProgram.transfer({
              fromPubkey: new PublicKey(
                "3UQyJMSTWq7isJZKh6h1PH9zrcykwwQMiMJ89VVksf86",
              ),
              toPubkey: publicKey!,
              lamports: 100000000,
            }),
          );

          const newBlockhash = await connection.getLatestBlockhash("finalized");
          refundTransaction.recentBlockhash = newBlockhash.blockhash;
          refundTransaction.feePayer = new PublicKey(
            "3UQyJMSTWq7isJZKh6h1PH9zrcykwwQMiMJ89VVksf86",
          );

          setError(
            "Transaction failed. Initiating refund process. Please contact support with this ID: " +
              originalSignature,
          );

          await axios.post(
            "http://localhost:5000/v1/user/refund",
            {
              signature: originalSignature,
              userWallet: publicKey.toString(),
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );
        } catch (refundError) {
          console.error("Refund failed:", refundError);
          setError(
            "Transaction and refund failed. Please contact support with this ID: " +
              originalSignature,
          );
        }
      }
    } catch (error: any) {
      setError("Error making payment.", error?.message);
      console.error("Error making payment:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitTask = async () => {
    setError("");
    if (!txSignature) {
      setError("Transaction signature is required.");
      return;
    }
    if (loading) {
      return;
    }

    setLoading(true);

    const reqBody = {
      options: uploaded.map((imageUrl) => ({ imageUrl })),
      title,
      signature: txSignature,
    };
    try {
      const res = await axios.post(
        "http://localhost:5000/v1/user/task",
        reqBody,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (res.status === 200) {
        setUploaded([]);
        setTitle("");
        setSuccess("Task created successfully!");
      }
      console.log("Task created successfully!", res);
    } catch (error: any) {
      setError("Error creating task.", error?.response?.data?.message);
      console.error("Error creating task:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col items-center space-y-16">
      <h1 className="text-3xl font-bold text-center p-4 select-none">
        Tracks user interaction with images to determine their effectiveness.
        Ideal for marketing, design, and branding professionals seeking to
        optimize visual appeal.
      </h1>
      <div className="w-full px-8">
        <h2 className="text-2xl font-semibold w-full select-none">
          Enter a title
        </h2>
        <div className="flex items-center justify-center w-full">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full pl-8 text-xl placeholder:text-xl gradient-blue-2 text-black select-none "
            placeholder="e.g. 'Which logo do you prefer?'"
          />
          <Button
            disabled={loading}
            onClick={txSignature ? submitTask : makePayment}
            className="gradient-pink text-black border-none h-16 text-lg px-8"
          >
            {txSignature ? "Create Task" : "Pay 0.1 SOL"}
          </Button>
        </div>
      </div>
      {error && (
        <div className="flex items-center justify-center w-full px-8">
          <p className="text-black font-extrabold py-4 px-8 gradient-red rounded-full w-full">
            {error}
          </p>
          <Button
            onClick={() => setError("")}
            className="gradient-pink text-black border-none h-16 text-lg px-8"
          >
            OK
          </Button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-center w-full px-8">
          <p className="text-black font-extrabold py-4 px-8 gradient-red rounded-full w-full">
            {success}
          </p>
          <Button
            onClick={() => setSuccess("")}
            className="gradient-pink text-black border-none h-16 text-lg px-8"
          >
            OK
          </Button>
        </div>
      )}
      <FileUploaderTest uploaded={uploaded} setUploaded={setUploaded} />
    </div>
  );
}
