/*
  Warnings:

  - A unique constraint covering the columns `[task_id,worker_id]` on the table `Submission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Submission_task_id_worker_id_key" ON "Submission"("task_id", "worker_id");
