import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const executeFile = promisify(execFile);

async function unusedPort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  return port;
}

async function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (listening: boolean) => {
      socket.destroy();
      resolve(listening);
    };
    socket.setTimeout(250);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

/** Start an isolated replica set. Never connects to the application's database. */
export async function startTestMongo() {
  const directory = await mkdtemp(join(tmpdir(), "crowdly-payment-tests-"));
  const port = await unusedPort();
  const logPath = join(directory, "mongod.log");
  const mongosh = process.env.MONGOSH_BINARY || "mongosh";
  const child = spawn(process.env.MONGOD_BINARY || "mongod", [
    "--dbpath", directory,
    "--port", String(port),
    "--bind_ip", "127.0.0.1",
    "--replSet", "crowdly-tests",
    "--logpath", logPath,
    "--wiredTigerCacheSizeGB", "0.25",
  ], { windowsHide: true, stdio: "ignore" });

  let launchError: Error | undefined;
  child.on("error", (error) => { launchError = error; });
  const exited = new Promise<void>((resolve) => child.once("close", () => resolve()));
  const shellArguments = ["--quiet", "--host", "127.0.0.1", "--port", String(port)];
  let ready = false;
  let stopped = false;

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      if (ready) {
        try {
          await executeFile(mongosh, [
            ...shellArguments,
            "--eval", 'db.getSiblingDB("admin").shutdownServer()',
          ], { windowsHide: true, timeout: 10_000 });
        } catch {
          // The shell can lose its connection during a successful shutdown.
        }
      }
      if (child.exitCode === null && child.signalCode === null) child.kill();
    }
    await exited;

    // Only remove the temporary directory created by this helper.
    const target = resolve(directory);
    assert.equal(dirname(target), resolve(tmpdir()));
    assert(basename(target).startsWith("crowdly-payment-tests-"));
    await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };

  try {
    const deadline = Date.now() + 25_000;
    while (!ready) {
      if (launchError) throw launchError;
      const log = await readFile(logPath, "utf8").catch(() => "No MongoDB log available");
      if (child.exitCode !== null || Date.now() > deadline) {
        throw new Error(`Test MongoDB did not start: ${log.slice(-3000)}`);
      }
      // Verify our own process bound the port before sending any commands.
      // Another process could claim it after unusedPort() releases its socket.
      ready = log.includes('"msg":"Waiting for connections"') && await isListening(port);
      if (ready) break;
      await delay(100);
    }

    await executeFile(mongosh, [
      ...shellArguments,
      "--eval",
      `rs.initiate({_id: "crowdly-tests", members: [{_id: 0, host: "127.0.0.1:${port}"}]});
       const deadline = Date.now() + 20000;
       while (!db.hello().isWritablePrimary) {
         if (Date.now() > deadline) throw new Error("Replica set did not elect a primary");
         sleep(100);
       }`,
    ], { windowsHide: true, timeout: 25_000 });

    return {
      url: `mongodb://127.0.0.1:${port}/crowdly_payment_tests?replicaSet=crowdly-tests`,
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}
