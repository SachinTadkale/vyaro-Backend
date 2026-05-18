import prisma from "../../../../config/prisma";

export class UserProfileInjector {
  /**
   * Fetches user profile context, including localized address details, and returns a formatted string block.
   */
  public static async injectContext(userId?: string): Promise<string> {
    if (!userId) {
      return "User Session Context: [Guest/Public Session - No user profile loaded]";
    }

    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        include: {
          farmDetails: true,
          deliveryPartner: true,
        },
      });

      if (!user) {
        return "User Session Context: [User record not found]";
      }

      const role = user.role;
      let context = `User Profile Context:\n`;
      context += `- Name: ${user.name}\n`;
      context += `- Phone: ${user.phone_no}\n`;
      context += `- Registered Role: ${role}\n`;
      context += `- Location Address: ${user.address || "Not specified"}\n`;

      if (user.farmDetails) {
        context += `- Farm Location: state=${user.farmDetails.state}, district=${user.farmDetails.district}, village=${user.farmDetails.village}\n`;
        context += `- Farm Land Area: ${user.farmDetails.landArea ?? "Not specified"} acres\n`;
      }

      if (user.deliveryPartner) {
        context += `- Delivery Vehicle: ${user.deliveryPartner.vehicleType} (${user.deliveryPartner.vehicleNumber})\n`;
        context += `- Available: ${user.deliveryPartner.isAvailable ? "Yes" : "No"}\n`;
      }

      return context;
    } catch (err: any) {
      console.error("[CONTEXT INJECTOR] Failed UserProfile injection:", err.message);
      return "User Session Context: [Failed to load user profile]";
    }
  }
}
