import prisma from "../../config/prisma";
import { DEFAULT_PROMPT_TEMPLATES } from "./constants/ai.constants";
import { logger } from "../../utils/logger";

/**
 * Self-healing AI prompt templates seeder.
 * Ensures the system has dynamic quick badges set up on system boot.
 */
export const bootstrapAiTemplates = async (): Promise<void> => {
  try {
    logger.info("🤖 Checking AI Prompt Templates database seeding...");

    const count = await prisma.aiPromptTemplate.count();
    
    if (count === 0) {
      logger.info("🌱 Seeding default AI prompt templates for all user roles...");
      
      for (const template of DEFAULT_PROMPT_TEMPLATES) {
        await prisma.aiPromptTemplate.create({
          data: {
            title: template.title,
            roleContext: template.roleContext,
            badgeLabel: template.badgeLabel,
            promptTemplate: template.promptTemplate,
            isActive: true,
          },
        });
      }
      
      logger.info(`✅ Seeded ${DEFAULT_PROMPT_TEMPLATES.length} AI Prompt Templates successfully.`);
    } else {
      logger.info(`✅ AI Prompt Templates already seeded. Found ${count} active badges.`);
    }
  } catch (error) {
    logger.error("❌ Failed to bootstrap AI Prompt Templates");
  }
};
