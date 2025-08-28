import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/encryption";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

interface PeacockRow {
    "Voucher Code": string;
    State?: string;
}

function loadData(): { voucherCode: string; state: string }[] {
    const workbook = XLSX.readFile(path.join(__dirname, "peacock.xlsx"));
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: PeacockRow[] = XLSX.utils.sheet_to_json(sheet);

    const seedData = data.map((row) => ({
        voucherCode: row["Voucher Code"],
        state: row["State"] || "ACTIVE", // default if missing
    }));

    console.log(`Loaded ${seedData.length} rows from Excel`);
    return seedData;
}

async function main() {
    const seedData = loadData();

    await prisma.$transaction(
        seedData.map(({ voucherCode, state }) => {
            const encrypted = encrypt(voucherCode);
            return prisma.peacockCode.create({
                data: {
                    voucherCode: encrypted,
                    state,
                },
            });
        })
    );

    console.log("✅ Peacock codes seeded into Postgres.");
}

main()
    .catch((err) => {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
