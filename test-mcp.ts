import { Agent } from './src/agent.js';
import { getMCPManager } from './src/mcp/client.js';
import { loadConfig } from './src/config.js';

async function testIntegration() {
  console.log("🔄 Loading Config & MCP Manager...");
  const config = loadConfig();
  const mcpManager = getMCPManager();
  
  console.log("🔌 Connecting to MCP Servers...");
  const results = await mcpManager.connectAll();
  console.log(`✅ Connected to ${results.length} servers.`);
  
  const mcpTools = mcpManager.getToolsForAI();
  console.log(`🛠️  Found ${mcpTools.length} MCP tools.`);
  mcpTools.forEach(t => console.log(`   - ${t.function.name}`));

  console.log("\n🤖 Initializing Agent...");
  const agent = new Agent({
    provider: 'minimax', // Default fallback
    model: 'minimax-m2',
    apiKey: 'dummy' // Not needed for system prompt generation
  });

  // Force system prompt refresh
  // @ts-ignore - Private method access for testing or assuming public
  if (typeof agent.refreshSystemPrompt === 'function') {
      // @ts-ignore
      agent.refreshSystemPrompt();
  }

  console.log("\n📝 Checking System Prompt for MCP Integration...");
  if (agent.systemPrompt.includes('mcp_')) {
    console.log("✅ SUCCESS: MCP tools are present in System Prompt!");
    console.log("---------------------------------------------------");
    // Extract the MCP section
    const mcpSection = agent.systemPrompt.split('You also have access to these external tools (MCP):')[1]?.split('## Project Context')[0];
    console.log(mcpSection ? mcpSection.trim() : "MCP Section found but empty?");
  } else {
    console.error("❌ FAILURE: MCP tools NOT found in System Prompt.");
    console.log("System Prompt Preview:", agent.systemPrompt.substring(0, 200));
  }
}

testIntegration().catch(console.error);
