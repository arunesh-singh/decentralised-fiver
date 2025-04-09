"use client";
import { Button } from "@/components/ui/button";
import { Task } from "@/schema";
import axios from "axios";
import Image from "next/image";
import { use, useEffect, useState } from "react";

export default function TasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [error, setError] = useState("");
  const [task, setTask] = useState<{
    title: string;
    options: {
      optionId: number;
      count: number;
      task: {
        imageUrl: string;
      };
    }[];
  } | null>(null);

  const { id } = use(params);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/v1/user/task`, {
          params: {
            taskId: id,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`, // Include your auth token if required
          },
        });

        if (response.status === 200) {
          setTask(response.data);
        }
        console.log(response.data);
      } catch (error) {
        if (error.response) {
          // Handle specific error status codes
          if (error.response.status === 411) {
            console.error(error.response.data.message);
          }
        }
        throw error;
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col items-center space-y-16">
      <div className="mt-10">
        <h1 className="text-xl font-bold text-center select-none">
          Title of the task
        </h1>
        <div className="w-full px-8 gradient-blue-2 text-black font-semibold h-10 flex items-center rounded-2xl ">
          {task?.title}
        </div>
      </div>
      <div className="w-full px-8 grid grid-cols-3 gap-8">
        {task?.options?.map((option, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center text-xl text-black select-none  gap-4"
          >
            <Image
              src={option.task.imageUrl}
              alt={`Image ${index}`}
              width={500}
              height={200}
              className="object-cover h-auto gradient-purple p-2 rounded-3xl"
            />
            <div className="px-4 gradient-purple-2 h-10 flex items-center rounded-2xl gradient-purple p-4">
              Votes : {option.count}
            </div>
          </div>
        ))}
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
    </div>
  );
}
