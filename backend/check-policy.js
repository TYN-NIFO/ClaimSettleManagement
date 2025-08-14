import mongoose from "mongoose";
import Policy from "./models/Policy.js";
import dotenv from "dotenv";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    const policy = await Policy.findOne().sort({ createdAt: -1 });
    console.log(
      "Current policy categories:",
      JSON.stringify(policy?.claimCategories, null, 2)
    );
    console.log("Categories count:", policy?.claimCategories?.length);
    process.exit(0);
  })
  .catch(console.error);
