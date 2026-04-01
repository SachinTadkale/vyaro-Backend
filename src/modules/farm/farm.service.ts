import prisma from "../../config/prisma";
import ApiError from "../../utils/apiError";

export const createFarm = async (userId: string, data: any) => {
  const existing = await prisma.farmDetails.findUnique({
    where: { userId },
  });

  if (existing) {
    throw new ApiError(409, "Farm details already added");
  }

  const farm = await prisma.farmDetails.create({
    data: {
      userId,
      state: data.state,
      district: data.district,
      village: data.village,
      pincode: data.pincode,
      landArea: data.landArea,
    },
  });

  await prisma.user.update({
    where: { user_id: userId },
    data: { registrationStep: 2 },
  });

  return {
    message: "Farm details added successfully",
    farm,
  };
};
