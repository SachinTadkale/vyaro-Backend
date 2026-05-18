const axios = require('axios');

async function main() {
  try {
    const res = await axios.get('https://openrouter.ai/api/v1/models');
    const models = res.data.data;
    console.log("Total models:", models.length);
    const deepseekModels = models.filter(m => m.id.toLowerCase().includes('deepseek'));
    console.log("\n--- DeepSeek Models ---");
    deepseekModels.forEach(m => {
      console.log(`- ID: ${m.id} | Name: ${m.name} | Cost (Prompt/Completion): ${m.pricing?.prompt}/${m.pricing?.completion}`);
    });
    
    const freeModels = models.filter(m => m.id.toLowerCase().includes(':free'));
    console.log("\n--- Free Models (:free) ---");
    freeModels.forEach(m => {
      console.log(`- ID: ${m.id} | Name: ${m.name}`);
    });
  } catch (err) {
    console.error("Error fetching models:", err.message);
  }
}

main();
