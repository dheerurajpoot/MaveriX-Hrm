"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Gift, Cake, Sparkles } from "lucide-react";
import type { Employee } from "@/lib/types";

const MONTHS_AHEAD = 3;

interface BirthdayEntry {
	employee: Employee;
	nextBirthday: Date;
	displayLabel: string;
	diffDays: number;
}

function getUpcomingBirthdays(employees: Employee[]): BirthdayEntry[] {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const endDate = new Date(today);
	endDate.setMonth(endDate.getMonth() + MONTHS_AHEAD);

	const entries: BirthdayEntry[] = [];

	for (const emp of employees) {
		const dob = emp.date_of_birth;
		if (!dob) continue;

		const [year, monthStr, dayStr] = dob.split("-");
		const month = parseInt(monthStr, 10) - 1;
		const day = parseInt(dayStr, 10);
		if (isNaN(month) || isNaN(day)) continue;

		let nextBirthday = new Date(today.getFullYear(), month, day);
		if (nextBirthday < today) {
			nextBirthday = new Date(today.getFullYear() + 1, month, day);
		}

		if (nextBirthday > endDate) continue;

		const diffMs = nextBirthday.getTime() - today.getTime();
		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

		let displayLabel: string;
		if (diffDays === 0) {
			displayLabel = "Today";
		} else if (diffDays === 1) {
			displayLabel = "Tomorrow";
		} else if (diffDays <= 7) {
			displayLabel = `In ${diffDays} days`;
		} else {
			displayLabel = nextBirthday.toLocaleDateString("en-IN", {
				month: "short",
				day: "numeric",
			});
		}

		entries.push({ employee: emp, nextBirthday, displayLabel, diffDays });
	}

	entries.sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());
	return entries;
}

function BirthdayBadge({
	displayLabel,
	diffDays,
}: {
	displayLabel: string;
	diffDays: number;
}) {
	const isToday = diffDays === 0;
	const isTomorrow = diffDays === 1;

	const style = isToday
		? "bg-pink-500/15 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500/30"
		: isTomorrow
		? "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
		: "bg-muted/80 text-muted-foreground";

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
			{isToday && <Sparkles className='h-3 w-3' />}
			{isTomorrow && <Cake className='h-3 w-3' />}
			{displayLabel}
		</span>
	);
}

export function UpcomingBirthdays() {
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchEmployees = async () => {
			const supabase = createClient();
			const { data } = await supabase
				.from("employees")
				.select("*")
				.not("date_of_birth", "is", null)
				.eq("is_active", true);
			setEmployees((data as Employee[]) || []);
			setLoading(false);
		};
		fetchEmployees();
	}, []);

	const upcoming = getUpcomingBirthdays(employees);

	return (
		<Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-gradient-to-b from-pink-50/50 to-transparent dark:from-pink-950/20 dark:to-transparent">
			<CardHeader className="pb-2">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400">
						<Gift className="h-5 w-5" />
					</div>
					<div>
						<CardTitle className="text-base font-semibold">Upcoming Birthdays</CardTitle>
						{!loading && upcoming.length > 0 && (
							<p className="text-xs text-muted-foreground mt-0.5">Next {MONTHS_AHEAD} months</p>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className='pt-0'>
				{loading ? (
					<div className='space-y-3'>
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className='flex items-center gap-3 rounded-lg p-2'>
								<div className='h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted' />
								<div className='flex-1 space-y-1.5'>
									<div className='h-3.5 w-20 animate-pulse rounded bg-muted' />
									<div className='h-3 w-14 animate-pulse rounded bg-muted/70' />
								</div>
							</div>
						))}
					</div>
				) : upcoming.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-8 text-center'>
						<div className='mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50'>
							<Cake className='h-7 w-7 text-muted-foreground/60' />
						</div>
						<p className='text-sm font-medium text-foreground'>
							No birthdays soon
						</p>
						<p className='text-xs text-muted-foreground mt-1 max-w-[180px]'>
							Birthdays in the next {MONTHS_AHEAD} months will
							appear here
						</p>
					</div>
				) : (
					<ul className='space-y-2'>
						{upcoming.map(
							({ employee, displayLabel, diffDays }) => {
								const isToday = diffDays === 0;
								const name = `${employee.first_name ?? ""} ${
									employee.last_name ?? ""
								}`.trim();
								return (
									<li
										key={employee.id}
										className={
											isToday
												? "flex items-center gap-3 rounded-xl border border-pink-200 bg-pink-50/50 p-3 transition-colors dark:border-pink-800/50 dark:bg-pink-950/30"
												: "flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-colors hover:bg-muted/30 dark:hover:bg-muted/20"
										}>
										<Avatar
											className={`h-10 w-10 shrink-0 ${
												isToday
													? "ring-2 ring-pink-400/50 dark:ring-pink-500/50"
													: ""
											}`}>
											{employee.avatar_url ? (
												<AvatarImage
												className="object-cover"
													src={employee.avatar_url}
													alt={name}
												/>
											) : null}
											<AvatarFallback className='text-xs font-medium bg-muted text-muted-foreground'>
												{employee.first_name?.[0]}
												{employee.last_name?.[0]}
											</AvatarFallback>
										</Avatar>
										<div className='flex-1 min-w-0'>
											<p className='text-sm font-medium truncate text-foreground'>
												{name}
											</p>
											{employee.designation && (
												<p className='text-xs text-muted-foreground truncate mt-0.5'>
													{employee.designation}
												</p>
											)}
										</div>
										<BirthdayBadge
											displayLabel={displayLabel}
											diffDays={diffDays}
										/>
									</li>
								);
							}
						)}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
