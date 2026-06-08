import { prisma } from "./src/lib/db";

async function main() {
  console.log("Simulating createEmployee query...");
  try {
    const employee = await prisma.employee.create({
      data: {
        tenantId: "cmppt93cx000080st5uomr28m",
        employeeId: "003",
        firstName: "Sidhartha",
        middleName: "Subham",
        lastName: "Sahoo",
        email: "subham.new@gmail.com",
        phone: "9556416908",
        gender: "MALE",
        departmentId: "cmpquhgcd0005acst0sqo2sgb",
        designation: "Devloper",
        dateOfJoining: new Date("2026-06-03T00:00:00.000Z"),
        employmentType: "FULL_TIME",
        ctc: 2.24,
      },
    });
    console.log("Employee created successfully in test:", employee);
  } catch (err: any) {
    console.error("EXACT ERROR MESSAGE RECEIVED:");
    console.error(err);
  }
}

main()
  .finally(() => prisma.$disconnect());
