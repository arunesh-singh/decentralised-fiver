"use client";
import { Button } from "@/components/ui/button";
import { Options, Task } from "@/schema";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [error, setError] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  const submission = async (optionId: number) => {
    setLoading(true);
    setError("");
    try {
      const reqBody = {
        selection: optionId.toString(),
        taskId: task?.id.toString(),
      };
      const res = await axios.post(
        "http://localhost:5000/v1/worker/submission",
        reqBody,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (res.status === 200) {
        setTask(res.data?.nextTask);
      }
      console.log("Submitted successfully!", res);
    } catch (error: any) {
      setError("Error submitting task.", error?.response?.data?.message);
      console.error("Error submitting task:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(
          "http://localhost:5000/v1/worker/nextTask",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (res.status === 200) {
          setTask(res.data?.task);
        }
        console.log("Task created successfully!", res);
      } catch (error: any) {
        setError("Error creating task.", error?.response?.data?.message);
        console.error("Error creating task:", error);
      } finally {
        setLoading(false);
      }
    };
    if (publicKey) {
      fetchData();
    }
  }, [publicKey]);
  return (
    <div className="flex flex-col items-center space-y-16">
      <h1 className="text-3xl font-bold text-center p-4 select-none">
        Tracks user interaction with images to determine their effectiveness.
        Ideal for marketing, design, and branding professionals seeking to
        optimize visual appeal.
      </h1>
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
      {loading ? (
        <div className="w-full px-8">
          <h2 className="text-2xl font-semibold w-full select-none">
            Loading...
          </h2>
        </div>
      ) : connected && task ? (
        <div className="w-full px-8 space-y-12">
          <div className="flex">
            <div className="px-4 gradient-blue-2 h-10 flex items-center rounded-2xl">
              {task.id}
            </div>
            <div className="w-full pl-8 gradient-blue-2 h-10 flex items-center rounded-2xl">
              {task.title}
            </div>
          </div>
          <div className="grid grid-cols-2 items-center justify-center w-full text-xl text-black select-none gap-10">
            {task?.options?.map((option, index) => (
              <div
                onClick={() => submission(option.id)}
                key={index}
                className="flex flex-col items-center justify-center text-xl text-black select-none  gap-4"
              >
                <Image
                  src={option.image_url}
                  alt={`Image ${index}`}
                  width={500}
                  height={200}
                  className="object-cover h-auto gradient-purple p-2 rounded-3xl"
                />
              </div>
            ))}
          </div>
        </div>
      ) : publicKey ? (
        <div className="w-full px-8">
          <h2 className="text-2xl font-semibold w-full select-none">
            No tasks available. Please check back later.
          </h2>
        </div>
      ) : (
        <div className="w-full px-8 flex items-center justify-center">
          <h2 className="text-2xl font-semibold w-full select-none">
            Please connect your wallet to start working.
          </h2>
        </div>
      )}
    </div>
  );
}
