import { EventEmitter } from "events";
import { Response } from "express";

export interface WorkflowProgressEvent {
  workflowId: string;
  stage: string;
  stepName: string;
  completedSteps: number;
  totalSteps: number;
  type?: string;
  event?: any;
  details?: Record<string, any>;
  timestamp: string;
}

class WorkflowEventManager extends EventEmitter {
  private activeStreams: Map<string, Set<Response>> = new Map();

  registerStream(workflowId: string, res: Response) {
    if (!this.activeStreams.has(workflowId)) {
      this.activeStreams.set(workflowId, new Set());
    }
    this.activeStreams.get(workflowId)!.add(res);

    res.on("close", () => {
      const streams = this.activeStreams.get(workflowId);
      if (streams) {
        streams.delete(res);
        if (streams.size === 0) {
          this.activeStreams.delete(workflowId);
        }
      }
    });
  }

  emitProgress(event: WorkflowProgressEvent) {
    this.emit("progress", event);

    const streams = this.activeStreams.get(event.workflowId);
    if (streams && streams.size > 0) {
      const payload = `data: ${JSON.stringify(event)}\n\n`;
      streams.forEach((res) => {
        res.write(payload);
        if (typeof (res as any).flush === "function") {
          (res as any).flush();
        }
      });
    }
  }
}

export const workflowEvents = new WorkflowEventManager();
