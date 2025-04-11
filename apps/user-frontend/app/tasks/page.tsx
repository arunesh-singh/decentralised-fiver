"use client";
import { Button } from "@workspace/ui/components/button";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TasksPage() {
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<
    {
      id: string;
      title: string;
      amount: number;
      createdAt: string;
      updatedAt: string;
      userId: string;
      taskId: string;
      status: string;
      options: {
        optionId: number;
        count: number;
        task: {
          imageUrl: string;
        };
      }[];
      task: {
        imageUrl: string;
      };
    }[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/v1/user/tasks`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (res.status === 200) {
          setTasks(res.data);
        }
        console.log("Task created successfully!", res);
      } catch (error: any) {
        setError(`Error fetching task. ${error?.response?.data?.message}`);
        console.error("Error creating task:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col items-center space-y-16">
      <h1 className="text-3xl font-bold text-center p-4 select-none">
        List of your tasks
      </h1>
      <div className="w-full px-8">
        {tasks.map((task) => (
          <Link key={task?.id} href={`/tasks/${task.id}`}>
            <div className="flex items-center justify-center w-full text-xl text-black select-none mt-4">
              <div className="px-4 gradient-blue-2 h-10 flex items-center rounded-2xl">
                {task?.id}
              </div>
              <div className="w-full pl-8 gradient-blue-2 h-10 flex items-center rounded-2xl">
                {task?.title}
              </div>
              <div className="px-8 gradient-blue-2 h-10 flex items-center rounded-2xl gap-2">
                <span> {task?.amount / 1000000}</span>
                <span> SOL</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {error && (
        <div className="flex items-center justify-center w-full px-8">
          <p className="text-black font-extrabold py-4 px-8 gradient-red rounded-full w-full">
            {error}
          </p>
          <Button
            onClick={() => setError("")}
            className="gradient-pink text-black border-none h-16 text-lg px-8">
            OK
          </Button>
        </div>
      )}
    </div>
  );
}
