import { clerkClient } from "@clerk/express";
import User from "../models/User.js";

const makeAdmin = async () => {
    try {
        const email = process.env.ADMIN_EMAIL;

        if (!email) {
            console.error("Admin promotion failed: ADMIN_EMAIL is not set");
            return;
        }

        const user = await User.findOne({ email });

        if (!user) {
            console.error("Admin promotion failed: no MongoDB user found for", email);
            return;
        }

        if (!user.clerkId) {
            console.error("Admin promotion failed: MongoDB user has no Clerk ID");
            return;
        }

        console.log("Promoting Clerk user:", user.clerkId);

        await clerkClient.users.updateUserMetadata(user.clerkId, {
            publicMetadata: { role: "admin" },
        });

        user.role = "admin";
        await user.save();

        console.log("Admin promotion succeeded");
    } catch (error: any) {
        console.error("Admin promotion failed:", error.message);
    }
};

export default makeAdmin;