require('dotenv').config();

const serverModule = process.env.PERF_SERVER_MODULE || '../src/server';
const { start, pool } = require(serverModule);

const durationSeconds = Number(process.env.PERF_OBSERVER_SECONDS || 120);

async function main() {
  if (!Number.isSafeInteger(durationSeconds) || durationSeconds < 10) {
    throw new Error('PERF_OBSERVER_SECONDS debe ser un entero de al menos 10.');
  }

  const server = await start();
  let previousCpu = process.cpuUsage();
  const interval = setInterval(() => {
    const cpu = process.cpuUsage(previousCpu);
    previousCpu = process.cpuUsage();
    process.stderr.write(`${JSON.stringify({
      sampledAt: new Date().toISOString(),
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      },
      cpuUserMs: Number((cpu.user / 1000).toFixed(2)),
      cpuSystemMs: Number((cpu.system / 1000).toFixed(2)),
      rssBytes: process.memoryUsage().rss
    })}\n`);
  }, 1000);

  await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));
  clearInterval(interval);
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
}

main().catch((error) => {
  console.error(`No se pudo observar el proceso Atlas: ${error.message}`);
  process.exitCode = 1;
});
