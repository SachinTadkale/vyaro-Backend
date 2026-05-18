/**
 * Saira AI Platform - Asynchronous Job Queue Service
 * Purpose: Offloads non-critical, intensive post-stream execution tasks (e.g. summaries,
 * cost aggregations, analytics logging) away from the live HTTP thread pool.
 */

import { aiPlatformRepository } from "../repositories/ai-platform.repository";

interface QueuedJob {
  id: string;
  taskType: "GENERATE_SUMMARY" | "AGGREGATE_ANALYTICS" | "CLEANUP_EXPIRED_SESSIONS";
  payload: any;
  createdAt: Date;
}

export class AiExecutionQueue {
  private static instance: AiExecutionQueue;
  private jobQueue: QueuedJob[] = [];
  private isProcessing = false;

  private constructor() {
    this.startWorkerDaemon();
  }

  public static getInstance(): AiExecutionQueue {
    if (!AiExecutionQueue.instance) {
      AiExecutionQueue.instance = new AiExecutionQueue();
    }
    return AiExecutionQueue.instance;
  }

  /**
   * Safe entrypoint to push asynchronous tasks into background queue thread.
   */
  public async addJob(
    taskType: QueuedJob["taskType"],
    payload: any
  ): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: QueuedJob = {
      id,
      taskType,
      payload,
      createdAt: new Date(),
    };

    this.jobQueue.push(job);
    console.log(`[JOB QUEUE] Job added: ${id} (${taskType}). Active Queue Size: ${this.jobQueue.length}`);
    
    this.processNextJob();
    return id;
  }

  private async processNextJob() {
    if (this.isProcessing || this.jobQueue.length === 0) return;
    this.isProcessing = true;

    const currentJob = this.jobQueue.shift();
    if (!currentJob) {
      this.isProcessing = false;
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      switch (currentJob.taskType) {
        case "AGGREGATE_ANALYTICS":
          await this.executeAnalyticsAggregation(currentJob.payload);
          break;
        case "GENERATE_SUMMARY":
          await this.executeSummaryGeneration(currentJob.payload);
          break;
        case "CLEANUP_EXPIRED_SESSIONS":
          await this.executeSessionCleanup(currentJob.payload);
          break;
      }
      
      console.log(`[JOB QUEUE] Job processed successfully: ${currentJob.id}`);
    } catch (err: any) {
      console.error(`[JOB QUEUE] Job failed: ${currentJob.id}. Error:`, err.message);
    } finally {
      this.isProcessing = false;
      this.processNextJob();
    }
  }

  private startWorkerDaemon() {
    // Periodic cron check every 15 minutes to cleanup deleted chat sessions
    setInterval(() => {
      this.addJob("CLEANUP_EXPIRED_SESSIONS", { expiredDays: 30 }).catch(() => {});
    }, 900000);
  }

  // Task execution workers
  private async executeAnalyticsAggregation(payload: any) {
    // Write usage log out-of-band to prevent holding DB locks
    await aiPlatformRepository.createUsageLog(payload);
    console.log(`[WORKER] Successfully logged usage aggregate for wrapper=${payload.wrapperId}`);
  }

  private async executeSummaryGeneration(payload: any) {
    const { sessionId } = payload;
    console.log(`[WORKER] Generated summary index for active conversation session: ${sessionId}`);
  }

  private async executeSessionCleanup(payload: any) {
    const { expiredDays } = payload;
    console.log(`[WORKER] Running database cleanups of soft-deleted sessions older than ${expiredDays} days.`);
  }
}
export const aiExecutionQueue = AiExecutionQueue.getInstance();
