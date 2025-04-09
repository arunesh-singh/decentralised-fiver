import * as z from "zod";

export const createTaskInput = z.object({
  options: z
    .array(
      z.object({
        imageUrl: z.string({
          message: "String is reqired",
        }),
      }),
    )
    .min(2, {
      message: "Minimum 2 options are required",
    }),
  title: z.string().optional(),
  signature: z.string(),
});

export const createSubmissionInput = z.object({
  selection: z.string(),
  taskId: z.string(),
});

export const createSignInInput = z.object({
  publicKey: z.string(),
  signature: z.instanceof(Uint8Array),
});
