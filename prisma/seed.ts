import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 12);

    const admin = await prisma.user.upsert({
        where: { email: "admin@airnav.co.id" },
        update: {},
        create: {
            email: "admin@airnav.co.id",
            password: adminPassword,
            name: "Administrator",
            role: "ADMIN",
        },
    });

    console.log(`✅ Created admin user: ${admin.email}`);

    // Create operator user
    const operatorPassword = await bcrypt.hash("operator123", 12);

    const operator = await prisma.user.upsert({
        where: { email: "operator@airnav.co.id" },
        update: {},
        create: {
            email: "operator@airnav.co.id",
            password: operatorPassword,
            name: "Operator WITT",
            role: "OPERATOR",
        },
    });

    console.log(`✅ Created operator user: ${operator.email}`);

    // Create viewer user
    const viewerPassword = await bcrypt.hash("viewer123", 12);

    const viewer = await prisma.user.upsert({
        where: { email: "viewer@airnav.co.id" },
        update: {},
        create: {
            email: "viewer@airnav.co.id",
            password: viewerPassword,
            name: "Viewer",
            role: "VIEWER",
        },
    });

    console.log(`✅ Created viewer user: ${viewer.email}`);

    console.log("\n📋 Default users:");
    console.log("  Admin:    admin@airnav.co.id / admin123");
    console.log("  Operator: operator@airnav.co.id / operator123");
    console.log("  Viewer:   viewer@airnav.co.id / viewer123");

    console.log("\n✨ Seeding complete!");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
