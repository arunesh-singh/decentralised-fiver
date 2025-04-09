import { z } from "zod";

// Enum schema
export const TxnStatusEnum = z.enum(["Processing", "Success", "Failure"]);
export type TxnStatus = z.infer<typeof TxnStatusEnum>;

// User schema
export const UserSchema = z.object({
  id: z.number().int(),
  address: z.string(),
  task: z.array(z.lazy(() => TaskSchema)).optional(),
  payout: z.array(z.lazy(() => PayoutsSchema)).optional(),
});
export type User = z.infer<typeof UserSchema>;

// Task schema
export const TaskSchema = z.object({
  id: z.number().int(),
  title: z.string().default("Select the most clickable thumbnail"),
  options: z.array(z.lazy(() => OptionsSchema)).optional(),
  signature: z.string(),
  amount: z.number().int(),
  done: z.boolean().default(false),
  user_id: z.number().int(),
  submission: z.array(z.lazy(() => SubmissionSchema)).optional(),
});
export type Task = z.infer<typeof TaskSchema>;

// Options schema
export const OptionsSchema = z.object({
  id: z.number().int(),
  image_url: z.string(),
  task_id: z.number().int(),
  submission: z.array(z.lazy(() => SubmissionSchema)).optional(),
});
export type Options = z.infer<typeof OptionsSchema>;

// Balance schema
export const BalanceSchema = z.object({
  id: z.number().int(),
  amount: z.number().int(),
  worker_id: z.number().int(),
});
export type Balance = z.infer<typeof BalanceSchema>;

// Worker schema
export const WorkerSchema = z.object({
  id: z.number().int(),
  address: z.string(),
  submission: z.array(z.lazy(() => SubmissionSchema)).optional(),
  balance: z.lazy(() => BalanceSchema).optional(),
  pending_amount: z.number().int(),
  locked_amount: z.number().int(),
});
export type Worker = z.infer<typeof WorkerSchema>;

// Submission schema
export const SubmissionSchema = z.object({
  id: z.number().int(),
  amount: z.string(),
  task_id: z.number().int(),
  option_id: z.number().int(),
  worker_id: z.number().int(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

// Payouts schema
export const PayoutsSchema = z.object({
  id: z.number().int(),
  amount: z.number().int(),
  user_id: z.number().int(),
  signature: z.string(),
  status: TxnStatusEnum,
});
export type Payouts = z.infer<typeof PayoutsSchema>;
