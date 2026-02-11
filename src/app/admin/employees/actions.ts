"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import type { UserRole } from "@/lib/types";

export type AddEmployeeInput = {
	first_name: string;
	last_name: string;
	email: string;
	joining_date?: string;
	designation?: string;
	role: UserRole;
	week_off_day?: number | null;
};

const EMPLOYEE_ID_PATTERN = /^\d{4}EMP-\d+$/;

async function nextEmployeeId(
	supabase: ReturnType<typeof createAdminClient>,
	joiningDate: string
): Promise<string> {
	const parsed = new Date(joiningDate);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error("Invalid joining date.");
	}
	const year = parsed.getFullYear();
	const prefix = `${year}EMP-`;

	// Get all existing employee IDs to find the global max serial
	const { data, error } = await supabase
		.from("employees")
		.select("employee_id")
		.not("employee_id", "is", null)
		.limit(50000);

	if (error) throw new Error(error.message);

	const ids = (data ?? []) as { employee_id: string | null }[];
	const serials = ids
		.map((r) => r.employee_id)
		.filter(
			(id): id is string =>
				typeof id === "string" && EMPLOYEE_ID_PATTERN.test(id)
		)
		.map((id) => parseInt(id.replace(/^\d{4}EMP-/, ""), 10))
		.filter((n) => !Number.isNaN(n));
	
	// Find the maximum serial number used across ALL years
	const maxSerial = serials.length > 0 ? Math.max(...serials) : 0;
	const nextSerial = maxSerial + 1;

	return `${prefix}${String(nextSerial).padStart(3, "0")}`;
}

export async function createEmployeeWithAuth(
	input: AddEmployeeInput
): Promise<{ ok: true } | { ok: false; error: string }> {
	try {
		// HR can only add employees with "employee" role
		const anonSupabase = await createClient();
		const {
			data: { user },
		} = await anonSupabase.auth.getUser();
		if (user) {
			const { data: caller } = await anonSupabase
				.from("employees")
				.select("role")
				.eq("id", user.id)
				.single();
			if (
				(caller as { role?: string } | null)?.role === "hr" &&
				input.role !== "employee"
			) {
				return {
					ok: false,
					error: "HR can only add employees with the Employee role.",
				};
			}
		}

		const supabase = createAdminClient();
		const email = input.email.trim().toLowerCase();

		const { data: existing, error: lookupError } = await supabase
			.from("employees")
			.select("id")
			.eq("email", email)
			.maybeSingle();

		if (lookupError) {
			return { ok: false, error: lookupError.message };
		}
		if (existing) {
			return {
				ok: false,
				error: "An employee with this email already exists.",
			};
		}

		// Use provided joining_date or current date for employee ID generation
		const joiningDate = input.joining_date || new Date().toISOString().split('T')[0];
		const employeeId = await nextEmployeeId(supabase, joiningDate);

		const { data: userData, error: authError } =
			await supabase.auth.admin.inviteUserByEmail(email, {
				data: {
					first_name: input.first_name,
					last_name: input.last_name,
				},
			});

		if (authError) {
			return { ok: false, error: authError.message };
		}
		if (!userData?.user?.id) {
			return { ok: false, error: "Invite sent but no user ID returned." };
		}

		const payload = {
			email,
			first_name: input.first_name.trim(),
			last_name: input.last_name.trim(),
			joining_date: input.joining_date || null,
			employee_id: employeeId,
			phone: null,
			designation: input.designation?.trim() || null,
			department: null,
			role: input.role,
			week_off_day: input.week_off_day ?? null,
			is_active: true,
		};

		const { data: existingRow } = await supabase
			.from("employees")
			.select("id")
			.eq("id", userData.user.id)
			.maybeSingle();

		if (existingRow) {
			// Trigger may have already created the row; update it with full data
			const { error: updateError } = await supabase
				.from("employees")
				.update(payload)
				.eq("id", userData.user.id);
			if (updateError) {
				return { ok: false, error: updateError.message };
			}
		} else {
			const { error: insertError } = await supabase
				.from("employees")
				.insert({ id: userData.user.id, ...payload });
			if (insertError) {
				return { ok: false, error: insertError.message };
			}
		}

		return { ok: true };
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "Failed to create employee";
		return { ok: false, error: message };
	}
}
