import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities.js";
import { fileURLToPath } from "node:url";
import { TASK_QUEUE } from "./constants.js";

async function runWorker() {
  const address = process.env.TEMPORAL_ADDRESS || "localhost:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";

  console.log(`[Temporal Worker] Connecting to Temporal server at ${address} (namespace: ${namespace})...`);
  const connection = await NativeConnection.connect({
    address,
  });

  const workflowsPath = fileURLToPath(new URL("./workflows.js", import.meta.url));

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: TASK_QUEUE,
    workflowsPath,
    activities,
  });

  console.log(`[Temporal Worker] Ready and listening on task queue: "${TASK_QUEUE}"`);
  await worker.run();
}

runWorker().catch((err) => {
  console.error("[Temporal Worker] Fatal worker error:", err);
  process.exit(1);
});
