import { collectAndSave } from "../src/lib/digest";

async function main(): Promise<void> {
  const digest = await collectAndSave(null);
  console.log(
    `采集完成：${digest.date}，${digest.items.length} 条，失败源 ${digest.failures.length} 个。`,
  );
  for (const failure of digest.failures) {
    console.log(`- ${failure.sourceId}: ${failure.error}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
