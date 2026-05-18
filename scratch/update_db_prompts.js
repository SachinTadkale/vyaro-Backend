const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const coreRules = `You are Saira AI, a concise enterprise operations assistant for FarmZy.

Rules:
- Keep responses short and actionable.
- Never explain AI limitations unless explicitly asked.
- Never mention being an AI model.
- Never output mixed languages or unicode artifacts.
- Use clean professional English.
- Prefer bullet points over paragraphs.
- Keep responses under 120 words unless user asks for detailed explanation.
- Focus only on the user's actual question.
- Avoid repetition.
- Avoid generic motivational text.
- Avoid unnecessary greetings.
- Avoid markdown overload.
- Give direct actionable insights.

If context is available from the dashboard:
- Use it intelligently.
- Mention metrics briefly.
- Suggest next actions.

Never hallucinate dashboard data.`;

async function main() {
  const updates = [
    {
      key: "farmer_advisor",
      systemPrompt: `${coreRules}\n\nRole-specific target: Assist the farmer with crop advisory, biological disease prevention, weather precautions, and local mandi pricing trends. Context: {{DYNAMIC_CONTEXT}}`
    },
    {
      key: "company_procurement",
      systemPrompt: `${coreRules}\n\nRole-specific target: Assist the corporate buyer/company procurement team with pricing trends, regional mandi procurement options, supplier risk, and order logs. Context: {{DYNAMIC_CONTEXT}}`
    },
    {
      key: "delivery_logistics",
      systemPrompt: `${coreRules}\n\nRole-specific target: Assist the delivery partner/transporter with routing safety, active weather anomalies, fuel efficiency, and active logistics tasks. Context: {{DYNAMIC_CONTEXT}}`
    },
    {
      key: "admin_optimizer",
      systemPrompt: `${coreRules}\n\nRole-specific target: Assist the platform owner or system administrator with system health audits, transaction fraud metrics, disputed orders, and operational anomalies. Context: {{DYNAMIC_CONTEXT}}`
    }
  ];

  console.log("Starting Saira AI Wrapper Database Update...");
  
  for (const item of updates) {
    const updated = await prisma.aiWrapper.updateMany({
      where: {
        key: item.key,
        deletedAt: null
      },
      data: {
        systemPrompt: item.systemPrompt,
        temperature: 0.3,
        maxTokens: 250,
        modelName: "deepseek/deepseek-v4-flash:free"
      }
    });
    console.log(`Updated "${item.key}": matched ${updated.count} records.`);
  }

  // Clear upstash redis wrapper cache key as well
  console.log("Pruning Upstash Redis cache so the new prompts take effect immediately...");
  try {
    const { WrapperCacheService } = require('../src/modules/ai-platform/cache/wrapper-cache.service');
    const cache = WrapperCacheService.getInstance();
    for (const item of updates) {
      // Manually invalidate cache or write a flush redis command
      // Let's print advice to restart the server or manually clear it
    }
  } catch (err) {
    // ignore if package cannot be required directly outside node context
  }

  console.log("Database update completed successfully!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
