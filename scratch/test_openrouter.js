const dotenv = require('dotenv');
dotenv.config();

const { OpenRouterAdapter } = require('../src/modules/ai-platform/adapters/openrouter/openrouter.adapter');

async function main() {
  console.log("=========================================");
  console.log("TESTING OPENROUTER TRANSPARENT FALLBACK");
  console.log("=========================================");
  console.log("- Primary Model in .env:", process.env.OPENROUTER_MODEL);
  console.log("- Fallback Models in .env:", process.env.OPENROUTER_FALLBACK_MODELS);
  
  const adapter = new OpenRouterAdapter();
  
  try {
    console.log("\nCalling Saira OpenRouter Fallback Chain...");
    const result = await adapter.generateResponse(
      "You are Saira AI, a friendly assistant.",
      [],
      "Hi Saira, tell me a 1-sentence agricultural tip.",
      {
        temperature: 0.7,
        maxTokens: 100
      }
    );
    
    console.log("\n🎉 RESPONSE SUCCESSFUL!");
    console.log("- Model Actually Used:", result.modelUsed);
    console.log("- Response Text:", result.text.trim());
    console.log("- Token Usage:", result.tokenUsage);
    console.log("- Response Time:", result.responseTimeMs + "ms");
  } catch (err) {
    console.error("\n❌ Fallback Chain failed completely!");
    console.error(err.message);
  }
}

main();
