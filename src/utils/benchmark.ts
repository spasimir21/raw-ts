import { spawnSync } from 'node:child_process';

interface BenchmarkOptions {
  warmupRuns: number;
  runs: number;
}

function benchmarkDistributor(testCaseCount: number) {
  for (let i = 0; i < testCaseCount; i++) {
    spawnSync(process.execPath, ['--expose-gc', process.argv[1]!, i.toString()], {
      stdio: 'inherit'
    });
    console.log();
  }
}

function benchmarkCase(
  [testCaseName, testCase]: [string, () => () => void],
  { warmupRuns, runs }: BenchmarkOptions
) {
  console.log(`${testCaseName} [${runs} runs, ${warmupRuns} warmups]`);

  for (let i = 0; i < warmupRuns; i++) testCase();

  const memory: number[] = new Array(runs).fill(0);
  const times: number[] = new Array(runs).fill(0);

  for (let i = 0; i < runs; i++) {
    // @ts-ignore
    global.gc();

    const startMemory = process.memoryUsage().heapUsed;
    const toTime = testCase();

    const startTime = performance.now();
    toTime();
    const endTime = performance.now();

    const endMemory = process.memoryUsage().heapUsed;

    memory[i] = (endMemory - startMemory) / 1024 / 1024;
    times[i] = endTime - startTime;

    // console.log(`  [${i + 1}]`);
    // console.log(`    Memory: ${memory[i].toFixed(2)} mb`);
    // console.log(`    Time: ${times[i].toFixed(2)} ms`);
  }

  memory.sort((a, b) => a - b);
  times.sort((a, b) => a - b);

  console.log(`  [Memory]`);
  console.log(`    Worst: ${memory[memory.length - 1]?.toFixed(2)} mb`);
  console.log(`    Mean: ${memory[Math.floor(memory.length / 2)]?.toFixed(2)} mb`);
  console.log(`    Best: ${memory[0]?.toFixed(2)} mb`);

  console.log(`  [Time]`);
  console.log(`    Worst: ${times[times.length - 1]?.toFixed(2)} ms`);
  console.log(`    Mean: ${times[Math.floor(times.length / 2)]?.toFixed(2)} ms`);
  console.log(`    Best: ${times[0]?.toFixed(2)} ms`);
}

function benchmark(testCases: [string, () => () => void][], options: BenchmarkOptions) {
  if (process.argv.length === 2) {
    benchmarkDistributor(testCases.length);
    return;
  }

  benchmarkCase(testCases[Number(process.argv[2])]!, options);
}

export { benchmark };
