import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { workerMiddleware } from "../workerMiddleware";
import { TOTAL_DECIMAL, WorkerJwtSecret } from "../config";
import { getNextTask } from "../db";
import { createSubmissionInput } from "../types";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

dotenv.config();

const router = Router();

const prismaClient = new PrismaClient();

const connection = new Connection((process.env.SOLANA_RPC_URL as string) || "");

prismaClient.$transaction(async (prisma) => {}, {
  maxWait: 5000,
  timeout: 10000,
});

const TOTAL_SUBMISSION = 100;

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

router.post("/payout", workerMiddleware, async (req, res) => {
  const workerId = req.userId;

  if (!workerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const worker = await prismaClient.worker.findFirst({
    where: { id: Number(workerId) },
  });

  if (!worker) {
    res.status(400).json({ message: "Worker not found" });
    return;
  }

  if (worker.pending_amount === 0) {
    res.status(400).json({ message: "No pending amount to payout" });
    return;
  }

  const address = worker.address;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey((process.env.WALLET_ADDRESS as string) || ""),
      toPubkey: new PublicKey(worker.address),
      lamports: (1000_000_000 * worker.pending_amount) / TOTAL_DECIMAL,
    })
  );

  const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    keypair,
  ]);
  if (!signature) {
    res.status(400).json({ message: "Transaction failed" });
    return;
  }

  try {
    await prismaClient.$transaction(
      async (tx) => {
        await tx.$executeRaw`BEGIN;
          LOCK TABLE "Worker" IN SHARE MODE;
          LOCK TABLE "Payouts" IN SHARE MODE;`;

        try {
          await tx.worker.update({
            where: { id: Number(workerId) },
            data: {
              pending_amount: {
                decrement: worker.pending_amount,
              },
              locked_amount: {
                increment: worker.pending_amount,
              },
            },
          });

          await tx.payouts.create({
            data: {
              user_id: Number(workerId),
              signature,
              status: "Processing",
              amount: worker.pending_amount,
            },
          });

          await tx.$executeRaw`COMMIT;`;
        } catch (error) {
          // Rollback in case of error
          await tx.$executeRaw`ROLLBACK;`;
          throw error;
        }
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma-specific errors
      if (error.code === "P2025") {
        throw new Error("Record not found");
      }
      if (error.code === "P2034") {
        throw new Error("Transaction timeout");
      }
    }
    throw error;
  }

  res.json({ message: "Processing Payouts" });
});

router.get("/balance", workerMiddleware, async (req, res) => {
  try {
    const workerId = req.userId;

    if (!workerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const worker = await prismaClient.worker.findUnique({
      where: { id: Number(workerId) },
      select: {
        pending_amount: true,
        locked_amount: true,
      },
    });

    res.json(worker);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/submission", workerMiddleware, async (req, res) => {
  const body = req.body;
  const workerId = req.userId;

  const parseData = createSubmissionInput.safeParse(body);

  if (!workerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!parseData.success) {
    res
      .status(411)
      .json({ message: "Invalid input data", error: parseData.error.errors });
    return;
  }

  try {
    const task = await getNextTask(workerId);

    if (!task) {
      res
        .status(400)
        .json({ message: "Invalid task or task already reviewed" });
      return;
    }

    if (task.id !== Number(parseData.data.taskId)) {
      res.status(400).json({ message: "Invalid task" });
      return;
    }

    const amount = (Number(task.amount) / TOTAL_SUBMISSION).toString();

    const submission = await prismaClient.$transaction(async (tx) => {
      const submission = await tx.submission.create({
        data: {
          worker_id: Number(workerId),
          task_id: Number(parseData.data.taskId),
          option_id: Number(parseData.data.selection),
          amount,
        },
      });

      await tx.worker.update({
        where: { id: Number(workerId) },
        data: {
          pending_amount: {
            increment: Number(amount),
          },
        },
      });

      return submission;
    });

    const nextTask = await getNextTask(workerId);

    res.json({ nextTask, amount });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/nextTask", workerMiddleware, async (req, res) => {
  try {
    const workerId = req.userId; // Make sure `req.userId` is correctly typed

    if (!workerId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const task = await prismaClient.task.findFirst({
      where: {
        done: false,
        submission: {
          none: {
            worker_id: Number(workerId),
          },
        },
      },
      select: {
        title: true,
        options: true,
        id: true,
      },
    });

    if (!task) {
      res
        .status(411)
        .json({ task: null, message: "No tasks left for you to review" });
      return;
    }

    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/signin", async (req, res) => {
  const { signature, publicKey } = req.body;

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

  const user = await prismaClient.worker.upsert({
    where: { address: publicKey },
    update: {},
    create: {
      address: publicKey,
      pending_amount: 0,
      locked_amount: 0,
    },
  });

  const token = jwt.sign({ userId: user.id }, WorkerJwtSecret as string);

  res.json({ token, amount: user.pending_amount / TOTAL_DECIMAL });
});

export default router;
