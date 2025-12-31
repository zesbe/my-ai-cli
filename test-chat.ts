import { Agent } from './src/agent.js';
import { getMCPManager } from './src/mcp/client.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function testChat() {
  console.log("🔄 Initializing...");
  const mcpManager = getMCPManager();
  try {
    await mcpManager.connectAll();
  } catch (e: any) { console.log("Connection warning:", e.message); }
  
  // Try to find a key, fallback to dummy
  let apiKey = 'dummy-key';
  try {
      const keyPath = path.join(os.homedir(), '.minimax_api_key');
      if (fs.existsSync(keyPath)) {
          apiKey = fs.readFileSync(keyPath, 'utf-8').trim();
      }
  } catch (e) {
      // ignore
  }

  const agent = new Agent({
    provider: 'minimax',
    model: 'minimax-m2',
    apiKey: apiKey,
    baseUrl: 'https://api.minimax.io/v1'
  });

  const prompt = "Buatkan rencana untuk membuat API login menggunakan Express.js dan JWT";
  console.log(`\n🤖 Sending prompt to AI: '${prompt}'`);
  console.log("---------------------------------------------------");

  await agent.chat(prompt, {
    onStart: () => console.log("[Started]"),
    onToken: (token: string) => process.stdout.write(token),
    onEnd: () => console.log("\n\n[Finished]"),
    onError: (err: any) => console.error("\n❌ Error:", err)
  });
}

testChat().catch(console.error);
