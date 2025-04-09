import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";

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

const jwtSecret = process.env.JWT_SECRET;

const isValidAuthHeader = (authHeader: string | undefined): boolean => {
  return !!authHeader && authHeader.startsWith("Bearer ");
};

const sendUnauthorizedResponse = (res: Response): void => {
  res.status(401).json({ message: "Unauthorized" });
};

const verifyToken = (token: string): any => {
  return jwt.verify(token, jwtSecret as string);
};

export const authMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.header("Authorization");

  if (!isValidAuthHeader(authHeader)) {
    sendUnauthorizedResponse(res);
    return;
  }

  try {
    const token = (authHeader as string).replace("Bearer ", "");
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    sendUnauthorizedResponse(res);
  }
};
