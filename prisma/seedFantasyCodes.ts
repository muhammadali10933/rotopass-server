// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.create({
        data: {
            email: 'testuser@gmail.com',
        },
    });

    await prisma.promoCode.create({
        data: {
            code: 'PROMO2025',
            userId: user.id,
        },
    });

    console.log(`Seeded promo code for user ${user.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
