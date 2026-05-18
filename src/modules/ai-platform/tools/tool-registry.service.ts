/**
 * Saira AI Platform - Agentic Tool Call Registry
 * Purpose: Provides a registry foundation for compile-time defined capabilities
 * that can be passed to LLM functions (e.g. Gemini, OpenAI) to perform platform actions.
 */

export interface SairaToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  handler: (args: any) => Promise<any>;
}

export class ToolRegistryService {
  private static instance: ToolRegistryService;
  private registry: Map<string, SairaToolDefinition> = new Map();

  private constructor() {
    this.registerCoreTools();
  }

  public static getInstance(): ToolRegistryService {
    if (!ToolRegistryService.instance) {
      ToolRegistryService.instance = new ToolRegistryService();
    }
    return ToolRegistryService.instance;
  }

  /**
   * Registers a tool into the AI capabilities registry.
   */
  public registerTool(tool: SairaToolDefinition) {
    if (this.registry.has(tool.name)) {
      console.warn(`[TOOL REGISTRY] Overwriting registered tool capability: ${tool.name}`);
    }
    this.registry.set(tool.name, tool);
    console.log(`[TOOL REGISTRY] Registered capability successfully: ${tool.name}`);
  }

  /**
   * Resolves a tool execution mapping.
   */
  public async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.registry.get(toolName);
    if (!tool) {
      throw new Error(`[TOOL REGISTRY] Tool "${toolName}" is not registered on Saira AI.`);
    }

    try {
      console.log(`[TOOL REGISTRY] Executing dynamic tool call: ${toolName} with arguments:`, args);
      return await tool.handler(args);
    } catch (err: any) {
      console.error(`[TOOL REGISTRY] Failed executing tool ${toolName}:`, err.message);
      throw err;
    }
  }

  /**
   * Returns generic JSON Schemas of all tools to append to provider payloads.
   */
  public getToolsSchema(): any[] {
    return Array.from(this.registry.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  private registerCoreTools() {
    // 1. Example Register: Crop Market Pricing lookup capability
    this.registerTool({
      name: "fetch_market_prices",
      description: "Lookup live mandi pricing rates for a specific crop and district",
      parameters: {
        type: "object",
        properties: {
          commodity: { type: "string", description: "Crop name e.g. Onion, Tomato" },
          district: { type: "string", description: "Location district e.g. Nashik, Pune" },
        },
        required: ["commodity"],
      },
      handler: async (args) => {
        // Concrete FarmZy connector logic will hook here in scaling phase
        return { success: true, modalPriceINR: 1950, rangeMin: 1600, rangeMax: 2200 };
      },
    });
  }
}
