import { PrismaClient, Prisma } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { createTaskInput } from "../types";
import { TOTAL_DECIMAL } from "../config";
import nacl from "tweetnacl";
import { Connection, PublicKey } from "@solana/web3.js";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

const router = Router();

const prismaClient = new PrismaClient();

const DEFAULT_TITLE = "Select the most clickable thumbnail";

const PARENT_WALLET_ADDRESS = (process.env.WALLET_ADDRESS as string) || "";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
  region: "eu-north-1",
});

const connection = new Connection((process.env.SOLANA_RPC_URL as string) || "");

router.post("/signin", async (req, res) => {
  const { signature, publicKey } = req.body;

  // const parseData = createSignInInput.safeParse(body);

  // if (!parseData.success) {
  //   res.status(411).json({
  //     error: parseData.error.errors,
  //     message: "You have passed the wrong input.",
  //   });
  //   return;
  // }

  const signedMesage = "Sign in on ClickPulse";
  const message = new TextEncoder().encode(signedMesage);

  let result;
  try {
    result = nacl.sign.detached.verify(
      message,
      new Uint8Array(signature.data),
      new PublicKey(publicKey).toBytes()
    );
  } catch (error) {
    res.status(401).json({
      message: "Invalid signature",
    });
    return;
  }

  const user = await prismaClient.user.upsert({
    where: { address: publicKey },
    update: {},
    create: { address: publicKey },
  });

  const token = jwt.sign({ userId: user.id }, jwtSecret as string);

  res.json({ token });
});

router.get("/tasks", authMiddleware, async (req, res) => {
  const userId = req.userId as string;

  const tasks = await prismaClient.task.findMany({
    where: {
      user_id: Number(userId),
    },
    include: {
      options: true,
    },
  });

  if (!tasks) {
    res.status(404).json({
      message: "You don't have any tasks.",
    });
    return;
  }

  res.json(tasks);
});

router.get("/task", authMiddleware, async (req, res) => {
  const taskId = req.query.taskId as string;

  if (!taskId) {
    res.status(411).json({
      message: "Task id is required.",
    });
    return;
  }
  const userId = req.userId as string;

  const taskDetail = await prismaClient.task.findFirst({
    where: {
      user_id: Number(userId),
      id: Number(taskId),
    },
    include: {
      options: true,
    },
  });

  if (!taskDetail) {
    res.status(411).json({
      message: "You don't have access to this task.",
    });
    return;
  }

  // Make this faster
  const responses = await prismaClient.submission.findMany({
    where: {
      task_id: Number(taskId),
    },
    include: {
      option: true,
    },
  });

  const result: Record<string, { count: number; task: { imageUrl: string } }> =
    {};

  const result2: {
    optionId: number;
    count: number;
    task: { imageUrl: string };
  }[] = taskDetail.options.map((option) => ({
    optionId: option.id,
    count: 0,
    task: {
      imageUrl: option.image_url,
    },
  }));
  responses.forEach((response) => {
    const option = result2.find((r) => r.optionId === response.option_id);
    if (option) {
      option.count++;
    }
  });

  res.json({
    title: taskDetail.title,
    options: result2,
  });
});

router.post("/task", authMiddleware, async (req, res) => {
  const body = req.body;
  const userId = req.userId;

  const parseData = createTaskInput.safeParse(body);

  if (!parseData.success) {
    res.status(411).json({
      error: parseData.error.errors,
      message: "You have passed the wrong input.",
    });
    return;
  }

  const user = await prismaClient.user.findFirst({
    where: {
      id: Number(userId),
    },
    select: {
      address: true,
    },
  });

  try {
    const transaction = await connection.getTransaction(
      parseData.data.signature,
      {
        maxSupportedTransactionVersion: 1,
      }
    );

    // Bypasss method
    if (
      (transaction?.meta?.postBalances[1] ?? 0) -
        (transaction?.meta?.preBalances[1] ?? 0) !==
      100000000
    ) {
      res.status(411).json({
        message: "Transaction signature/amount is not correct",
      });
      return;
    }

    const accountKeys = transaction?.transaction.message.getAccountKeys();
    const parent = accountKeys?.get(1)?.toString();

    if (parent !== PARENT_WALLET_ADDRESS) {
      res.status(411).json({
        message: "Transaction sent to wrong address",
      });
      return;
    }

    const sender = accountKeys?.get(0)?.toString();
    if (sender !== user?.address) {
      res.status(411).json({
        message: "Transaction not sent from the correct user address",
      });
      return;
    }

    const response = await prismaClient.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: parseData.data.title ?? DEFAULT_TITLE,
          amount: 0.1 * TOTAL_DECIMAL,
          signature: parseData.data.signature,
          user_id: Number(userId),
        },
      });

      const res = await tx.options.createMany({
        data: parseData.data.options.map((option) => ({
          image_url: option.imageUrl,
          task_id: task.id,
        })),
      });

      return task;
    });

    res.json({
      id: response.id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get("/presignedUrl", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: "arya-decentralised-fiver",
    Key: `fiver/${userId}/${Math.random()}/image.png`,
    Conditions: [["content-length-range", 0, 1024 * 1024 * 4]],
    Fields: {
      "Content-Type": "image/png",
    },
    Expires: 3600,
  });

  res.json({ url, fields });
});

export default router;
