import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { WorkerJwtSecret } from "./config";

interface JwtPayload {
  userId: string;
}

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const isValidAuthHeader = (authHeader: string | undefined): boolean => {
  return !!authHeader && authHeader.startsWith("Bearer ");
};

const sendUnauthorizedResponse = (res: Response): void => {
  res.status(401).json({ message: "Unauthorized" });
};

const verifyToken = (token: string): any => {
  return jwt.verify(token, WorkerJwtSecret as string);
};

export const workerMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.header("Authorization");

  console.log(authHeader);
  if (!isValidAuthHeader(authHeader)) {
    sendUnauthorizedResponse(res);
    return;
  }

  try {
    const token = (authHeader as string).replace("Bearer ", "");
    const decoded = verifyToken(token) as JwtPayload; // Ensure proper type assertion
    req.userId = decoded.userId; // Assign userId to req
    next();
  } catch (error) {
    sendUnauthorizedResponse(res);
  }
};
