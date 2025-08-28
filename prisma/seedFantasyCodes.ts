// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // ✅ Create a test user
    const user = await prisma.user.create({
        data: {
            email: "testuser@gmail.com",
            first_name: "Test",
            last_name: "User",
            status: 0,
        },
    });

    // ✅ Attach a promo code to the user
    await prisma.promoCode.create({
        data: {
            code: "PROMO2025",
            userId: user.id, // UUID string
        },
    });

    console.log(`✅ Seeded promo code for user ${user.email}`);
}

main()
    .catch((e) => {
        console.error("❌ Error during seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
