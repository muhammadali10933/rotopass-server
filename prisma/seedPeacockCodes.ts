import { PrismaClient } from "@prisma/client";
import { encrypt } from "../src/lib/encryption";

const prisma = new PrismaClient();

function loadData() {
    const XLSX = require("xlsx");
    const path = require("path");

    const workbook = XLSX.readFile(path.join(__dirname, "peacock.xlsx"));
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Assuming your file has columns like 'Campaign' and 'State'
    const seedData = data.map((row: { [key: string]: any }) => ({
        voucherCode: row['Voucher Code'],  // The column name from your spreadsheet
        state: row['State']            // Adjust as needed based on your sheet structure
    }));

    console.log(seedData); // Log to check the data structure

    return seedData;
}

async function main() {
    const seedData = loadData();

    for (const { voucherCode, state } of seedData) {
        const encrypted = encrypt(voucherCode);

        await prisma.peacockCode.create({
            data: {
                voucherCode: encrypted,
                state
            },
        });
    }
}

main()
    .then(() => {
        console.log("Seeding complete.");
        return prisma.$disconnect();
    })
    .catch((err) => {
        console.error("Seeding failed:", err);
        return prisma.$disconnect().then(() => process.exit(1));
    });
