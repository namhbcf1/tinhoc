import { describe, expect, test } from "vitest";

describe("Finance & Debt Logic", () => {
	test("Học viên đóng nửa tiền khóa web -> Nợ 50%", () => {
		// Giả lập Data
		const totalOwed = 1000000;
		const totalPaid = 500000;

		const debt = totalOwed - totalPaid;

		expect(debt).toBe(500000);
		expect(debt > 0).toBe(true);
	});
});
