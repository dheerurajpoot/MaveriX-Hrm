"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import type { UserRole } from "@/lib/types";

export type BulkInviteInput = {
	email: string;
	role: UserRole;
};

export type BulkInviteResult = {
	email: string;
	success: boolean;
	error?: string;
	skipped?: boolean;
	reason?: string;
};

/**
 * Check which emails already exist in the database
 */
export async function checkExistingEmails(
	emails: string[]
): Promise<{ ok: true; existingEmails: string[] } | { ok: false; error: string }> {
	try {
		const supabase = createAdminClient();
		const normalizedEmails = emails.map((e) => e.trim().toLowerCase());

		const { data, error } = await supabase
			.from("employees")
			.select("email")
			.in("email", normalizedEmails);

		if (error) {
			return { ok: false, error: error.message };
		}

		const existingEmails = (data || []).map((row) => row.email);
		return { ok: true, existingEmails };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Failed to check existing emails";
		return { ok: false, error: message };
	}
}

/**
 * Bulk invite multiple employees by email
 */
export async function bulkInviteEmployees(
	inputs: BulkInviteInput[]
): Promise<{ ok: true; results: BulkInviteResult[] } | { ok: false; error: string }> {
	try {
		// Check caller's role
		const anonSupabase = await createClient();
		const {
			data: { user },
		} = await anonSupabase.auth.getUser();

		if (!user) {
			return { ok: false, error: "Not authenticated" };
		}

		const { data: caller } = await anonSupabase
			.from("employees")
			.select("role")
			.eq("id", user.id)
			.single();

		const callerRole = (caller as { role?: string } | null)?.role;

		if (callerRole !== "admin" && callerRole !== "hr") {
			return { ok: false, error: "Only Admin and HR can bulk invite employees" };
		}

		const supabase = createAdminClient();
		const results: BulkInviteResult[] = [];

		// Process each email
		for (const input of inputs) {
			const email = input.email.trim().toLowerCase();

			// HR can only add employees with "employee" role
			if (callerRole === "hr" && input.role !== "employee") {
				results.push({
					email,
					success: false,
					error: "HR can only invite employees with the Employee role.",
				});
				continue;
			}

			// Check if email already exists
			const { data: existing } = await supabase
				.from("employees")
				.select("id")
				.eq("email", email)
				.maybeSingle();

			if (existing) {
				results.push({
					email,
					success: false,
					skipped: true,
					reason: "Email already exists in the system",
				});
				continue;
			}

			// Generate employee ID
			const joiningDate = new Date().toISOString().split("T")[0];
			const employeeId = await nextEmployeeId(supabase, joiningDate);

			// Send invitation
			const { data: userData, error: authError } =
				await supabase.auth.admin.inviteUserByEmail(email, {
					data: {
						first_name: "",
						last_name: "",
					},
				});

			if (authError) {
				results.push({
					email,
					success: false,
					error: authError.message,
				});
				continue;
			}

			if (!userData?.user?.id) {
				results.push({
					email,
					success: false,
					error: "Invite sent but no user ID returned.",
				});
				continue;
			}

			// Insert into employees table
			const payload = {
				email,
				first_name: "",
				last_name: "",
				joining_date: joiningDate,
				employee_id: employeeId,
				phone: null,
				designation: null,
				department: null,
				role: input.role,
				week_off_day: null,
				is_active: true,
			};

			const { data: existingRow } = await supabase
				.from("employees")
				.select("id")
				.eq("id", userData.user.id)
				.maybeSingle();

			if (existingRow) {
				const { error: updateError } = await supabase
					.from("employees")
					.update(payload)
					.eq("id", userData.user.id);

				if (updateError) {
					results.push({
						email,
						success: false,
						error: updateError.message,
					});
					continue;
				}
			} else {
				const { error: insertError } = await supabase
					.from("employees")
					.insert({ id: userData.user.id, ...payload });

				if (insertError) {
					results.push({
						email,
						success: false,
						error: insertError.message,
					});
					continue;
				}
			}

			results.push({
				email,
				success: true,
			});
		}

		return { ok: true, results };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Failed to bulk invite employees";
		return { ok: false, error: message };
	}
}

// Helper function to generate employee ID
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
	const nextSerial = serials.length > 0 ? Math.max(...serials) + 1 : 1;

	return `${prefix}${String(nextSerial).padStart(3, "0")}`;
}
