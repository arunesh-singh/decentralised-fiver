import { PrismaClient } from "@prisma/client";

const prismaClient = new PrismaClient();

export const getNextTask = (userId: string) => {
  return prismaClient.task.findFirst({
    where: {
      done: false,
      submission: {
        none: {
          worker_id: Number(userId),
        },
      },
    },
    select: {
      id: true,
      amount: true,
      title: true,
      options: true,
    },
  });
};
