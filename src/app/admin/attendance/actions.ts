"use server";

import { createClient } from "@/lib/supabase/server";


export async function applyLatePolicyDeduction(
	employeeId: string,
	year: number,
	month: number
): Promise<{ success: boolean; message: string }> {
	try {
		const supabase = await createClient();

		// Fetch settings
		const { data: settings } = await supabase
			.from("settings")
			.select("*")
			.limit(1)
			.single();

		if (!settings) {
			return { success: false, message: "Settings not found" };
		}

		const maxLateDays = settings.max_late_days as number;
		const deductionPerDay =
			settings.late_policy_deduction_per_day as number;
		const leaveTypeId = settings.late_policy_leave_type_id as string | null;

		if (!leaveTypeId) {
			// No leave type configured for late policy
			return {
				success: true,
				message: "Late policy not configured (no leave type set)",
			};
		}

		// Count late days in the given month for the employee
		const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
		const nextMonth = month === 12 ? 1 : month + 1;
		const nextYear = month === 12 ? year + 1 : year;
		const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

		const { count } = await supabase
			.from("attendance")
			.select("*", { count: "exact", head: true })
			.eq("employee_id", employeeId)
			.eq("status", "late")
			.gte("date", monthStart)
			.lt("date", monthEnd);

		const lateCount = count ?? 0;

		// Get existing log for this month
		const { data: logData } = await supabase
			.from("late_deductions_log")
			.select("*")
			.eq("employee_id", employeeId)
			.eq("year", year)
			.eq("month", month)
			.single();

		const lastDeductedCount = logData?.last_deducted_late_count ?? 0;

		// Calculate new deduction
		const totalToDeduct =
			Math.max(0, lateCount - maxLateDays) * deductionPerDay;
		const alreadyDeducted =
			Math.max(0, lastDeductedCount - maxLateDays) * deductionPerDay;
		const newDeduction = totalToDeduct - alreadyDeducted;

		if (newDeduction <= 0) {
			return {
				success: true,
				message: `No new deduction (late days: ${lateCount}, max: ${maxLateDays})`,
			};
		}

		// Deduct from leave balance
		const { error: balanceError } = await supabase.rpc(
			"increment_leave_balance",
			{
				p_employee_id: employeeId,
				p_leave_type_id: leaveTypeId,
				p_year: year,
				p_increment: newDeduction,
			}
		);

		if (balanceError) {
			// RPC doesn't exist, do it manually
			const { data: balance } = await supabase
				.from("leave_balances")
				.select("*")
				.eq("employee_id", employeeId)
				.eq("leave_type_id", leaveTypeId)
				.eq("year", year)
				.single();

			if (balance) {
				const newUsed = (balance.used_days as number) + newDeduction;
				await supabase
					.from("leave_balances")
					.update({ used_days: newUsed })
					.eq("id", balance.id);
			} else {
				// No balance record, insert one
				const { data: leaveType } = await supabase
					.from("leave_types")
					.select("default_days")
					.eq("id", leaveTypeId)
					.single();
				const totalDays = leaveType?.default_days ?? 0;
				await supabase.from("leave_balances").insert({
					employee_id: employeeId,
					leave_type_id: leaveTypeId,
					year,
					total_days: totalDays,
					used_days: newDeduction,
				});
			}
		}

		// Update log
		if (logData) {
			await supabase
				.from("late_deductions_log")
				.update({
					last_deducted_late_count: lateCount,
					total_deducted:
						(logData.total_deducted as number) + newDeduction,
					updated_at: new Date().toISOString(),
				})
				.eq("id", logData.id);
		} else {
			await supabase.from("late_deductions_log").insert({
				employee_id: employeeId,
				year,
				month,
				last_deducted_late_count: lateCount,
				total_deducted: newDeduction,
				leave_type_id: leaveTypeId,
			});
		}

		return {
			success: true,
			message: `Deducted ${newDeduction} day(s) for ${lateCount} late days`,
		};
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Apply late policy deduction for all employees in a given month.
 */
export async function applyLatePolicyForAllEmployees(
	year: number,
	month: number
): Promise<{ success: boolean; message: string }> {
	try {
		const supabase = await createClient();

		// Fetch all active employees (excluding admin role)
		const { data: employees } = await supabase
			.from("employees")
			.select("id")
			.eq("is_active", true)
			.neq("role", "admin");

		if (!employees || employees.length === 0) {
			return { success: false, message: "No active employees found" };
		}

		let processed = 0;
		for (const emp of employees) {
			const result = await applyLatePolicyDeduction(emp.id, year, month);
			if (result.success) processed++;
		}

		return {
			success: true,
			message: `Processed ${processed} / ${employees.length} employees`,
		};
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
