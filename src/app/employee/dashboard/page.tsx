"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser } from "../../../contexts/user-context";
import Link from "next/link";
import {
	Clock,
	Calendar,
	CheckCircle2,
	Timer,
	CalendarDays,
	Users,
	User,
	Mail,
	Building2,
	CalendarCheck,
	ArrowRight,
	Plus,
	Square,
} from "lucide-react";
import type {
	Attendance,
	LeaveBalance,
	LeaveType,
	TeamMember,
} from "@/lib/types";

interface LeaveBalanceWithType extends LeaveBalance {
	leave_type?: LeaveType;
}

interface MinimalTeamMember {
	id: string;
	employee_id: string;
	first_name: string;
	last_name: string;
	designation: string | null;
	email: string;
	isSelf: boolean;
	isLeader: boolean;
}

/** Local date as YYYY-MM-DD (avoids UTC shift in calendar and API queries). */
function toLocalDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		"0"
	)}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EmployeeDashboardPage() {
	const { employee } = useUser();
	const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(
		null
	);
	const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceWithType[]>(
		[]
	);
	const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
	const [monthAttendance, setMonthAttendance] = useState<Attendance[]>([]);
	const [teamMembers, setTeamMembers] = useState<MinimalTeamMember[]>([]);
	const [isTeamLoading, setIsTeamLoading] = useState(false);
	const [festivalMap, setFestivalMap] = useState<Record<string, string[]>>(
		{}
	);
	const [selectedFestivalDate, setSelectedFestivalDate] = useState<
		string | null
	>(null);
	const [stats, setStats] = useState({
		daysWorked: 0,
		hoursThisWeek: 0,
		pendingLeaves: 0,
		approvedLeaves: 0,
	});
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		if (employee) {
			fetchData();
		}
	}, [employee]);

	// Live clock/timer tick (for current time when not clocked in, elapsed when clocked in)
	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);

	const fetchData = async () => {
		if (!employee) return;
		const supabase = createClient();
		const today = toLocalDateStr(new Date());
		const currentYear = new Date().getFullYear();

		// Fetch today's attendance
		const { data: attendanceData } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.eq("date", today)
			.single();

		setTodayAttendance(attendanceData as Attendance | null);

		// Fetch leave balances
		const { data: leaveBalanceData } = await supabase
			.from("leave_balances")
			.select("*, leave_type:leave_types(*)")
			.eq("employee_id", employee.id)
			.eq("year", currentYear);

		setLeaveBalances(
			(leaveBalanceData as unknown as LeaveBalanceWithType[]) || []
		);

		// Fetch attendance for this month (for stats, recent list, calendar)
		const monthStart = toLocalDateStr(
			new Date(currentYear, new Date().getMonth(), 1)
		);
		const { data: monthAttendanceData } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.gte("date", monthStart)
			.order("date", { ascending: true });

		const monthAttendanceTyped =
			(monthAttendanceData as Attendance[]) || [];

		const daysWorked = monthAttendanceTyped.filter((a) =>
			["present", "late"].includes(a.status)
		).length;

		setMonthAttendance(monthAttendanceTyped);
		setRecentAttendance(
			[...monthAttendanceTyped]
				.sort((a, b) => b.date.localeCompare(a.date))
				.slice(0, 5)
		);

		// Fetch pending leave requests
		const { count: pendingLeaves } = await supabase
			.from("leave_requests")
			.select("*", { count: "exact", head: true })
			.eq("employee_id", employee.id)
			.eq("status", "pending");

		// Fetch approved leaves this year
		const { count: approvedLeaves } = await supabase
			.from("leave_requests")
			.select("*", { count: "exact", head: true })
			.eq("employee_id", employee.id)
			.eq("status", "approved");

		setStats({
			daysWorked: daysWorked || 0,
			hoursThisWeek: 0,
			pendingLeaves: pendingLeaves || 0,
			approvedLeaves: approvedLeaves || 0,
		});

		// Fetch minimal team info (first team only, up to a few members + leader)
		setIsTeamLoading(true);
		const { data: membershipData } = await supabase
			.from("team_members")
			.select("team_id")
			.eq("employee_id", employee.id)
			.limit(1);

		const teamId = membershipData?.[0]?.team_id as string | undefined;
		if (teamId) {
			const { data: teamData } = await supabase
				.from("teams")
				.select(
					"leader_id, leader:employees!teams_leader_id_fkey(id, first_name, last_name, designation, email)"
				)
				.eq("id", teamId)
				.single();

			const leaderId = (teamData as any)?.leader_id as string | null;
			const leaderEmp = (teamData as any)?.leader;

			const { data: teamMembersData } = await supabase
				.from("team_members")
				.select(
					"id, employee:employees(id, first_name, last_name, designation, email)"
				)
				.eq("team_id", teamId)
				.limit(10);

			const mapped: MinimalTeamMember[] =
				teamMembersData?.map((m: any) => ({
					id: m.id,
					employee_id: m.employee.id,
					first_name: m.employee.first_name,
					last_name: m.employee.last_name,
					designation: m.employee.designation,
					email: m.employee.email,
					isSelf: m.employee.id === employee.id,
					isLeader: m.employee.id === leaderId,
				})) || [];

			if (
				leaderId &&
				leaderEmp &&
				!mapped.some((x) => x.employee_id === leaderId)
			) {
				mapped.unshift({
					id: `leader-${leaderId}`,
					employee_id: leaderId,
					first_name: leaderEmp.first_name,
					last_name: leaderEmp.last_name,
					designation: leaderEmp.designation ?? null,
					email: leaderEmp.email ?? "",
					isSelf: leaderId === employee.id,
					isLeader: true,
				});
			}
			setTeamMembers(mapped);
		} else {
			setTeamMembers([]);
		}
		setIsTeamLoading(false);
	};

	const handleClockIn = async () => {
		if (!employee) return;
		const supabase = createClient();
		const today = toLocalDateStr(new Date());
		const now = new Date().toISOString();

		await supabase.from("attendance").insert({
			employee_id: employee.id,
			date: today,
			clock_in: now,
			status: "present",
		});

		await fetchData();
	};

	const handleClockOut = async () => {
		if (!todayAttendance || !employee) return;
		const supabase = createClient();
		const now = new Date();
		const clockIn = new Date(todayAttendance.clock_in!);
		const totalHours = (
			(now.getTime() - clockIn.getTime()) /
			(1000 * 60 * 60)
		).toFixed(2);

		await supabase
			.from("attendance")
			.update({
				clock_out: now.toISOString(),
				total_hours: parseFloat(totalHours),
			})
			.eq("id", todayAttendance.id);

		await fetchData();
	};

	const formatTime = (timeString: string | null) => {
		if (!timeString) return "-";
		return new Date(timeString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getElapsedHMS = (clockInIso: string, toDate: Date) => {
		const start = new Date(clockInIso).getTime();
		const end = toDate.getTime();
		const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		return {
			hours: String(hours).padStart(2, "0"),
			minutes: String(minutes).padStart(2, "0"),
			seconds: String(seconds).padStart(2, "0"),
		};
	};

	const formatCurrentTimeAMPM = (d: Date) => {
		return d.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	};

	const getCurrentTimeParts = (d: Date) => {
		const hours12 = d.getHours() % 12 || 12;
		const ampm = d.getHours() < 12 ? "AM" : "PM";
		return {
			hours: String(hours12).padStart(2, "0"),
			minutes: String(d.getMinutes()).padStart(2, "0"),
			ampm,
		};
	};

	const totalLeaveTypes = leaveBalances.length;

	const monthDays = useMemo(() => {
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const days: Array<Date | null> = [];

		const leadingEmpty = firstDay.getDay(); // 0-6
		for (let i = 0; i < leadingEmpty; i++) {
			days.push(null);
		}
		for (let d = 1; d <= lastDay.getDate(); d++) {
			days.push(new Date(year, month, d));
		}
		return days;
	}, []);

	const monthAttendanceByDate = useMemo(() => {
		const map: Record<string, Attendance> = {};
		for (const a of monthAttendance) {
			map[a.date] = a;
		}
		return map;
	}, [monthAttendance]);

	// Fetch festival / holiday events for this month from Google Calendar
	useEffect(() => {
		const fetchFestivals = async () => {
			const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
			const calendarId = "en.indian#holiday@group.v.calendar.google.com";
			if (!apiKey || !calendarId) return;

			const today = new Date();
			const year = today.getFullYear();
			const month = today.getMonth();
			const timeMin = new Date(year, month, 1).toISOString();
			const timeMax = new Date(year, month + 1, 0).toISOString();

			const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
				calendarId
			)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

			try {
				const res = await fetch(url);
				if (!res.ok) return;
				const json = await res.json();
				const items =
					(json.items as Array<{
						summary?: string;
						start?: { date?: string; dateTime?: string };
					}>) || [];

				const map: Record<string, string[]> = {};
				for (const ev of items) {
					const title = ev.summary || "Holiday";
					const startDate =
						ev.start?.date ||
						(ev.start?.dateTime
							? ev.start.dateTime.split("T")[0]
							: undefined);
					if (!startDate) continue;
					if (!map[startDate]) map[startDate] = [];
					map[startDate].push(title);
				}
				setFestivalMap(map);
			} catch {
				// Calendar is optional; fail silently
			}
		};

		fetchFestivals();
	}, []);

	const todayStr = toLocalDateStr(new Date());

	return (
		<div className="flex flex-col min-h-full bg-gradient-to-b from-muted/30 to-background">
			<DashboardHeader title="My Dashboard" />

			<div className="flex-1 space-y-8 p-4">
				{/* Top row: Clock & Today summary */}
				<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
					<Card className="rounded-2xl border border-border/60 bg-gradient-to-tr from-sky-50 to-violet-100">
						<CardContent className="p-6 space-y-6">
							{/* Greeting */}
							<div>
								<div className="flex items-center justify-start gap-2">
									<p className="text-md text-gray-500 font-bold m-0 leading-none">
										Hey 👋{employee ? `, ${employee.first_name}` : ""}
									</p>

									<p className="text-sm border border-primary text-primary px-2 py-1 rounded-full leading-none flex items-center">
										{new Date().toLocaleDateString("en-US", {
											weekday: "short",
											month: "short",
											day: "numeric",
										})}
									</p>
								</div>


								<h3 className="text-2xl mt-2 font-bold sm:text-4xl">
									Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}
								</h3>
								{/* <p className="text-sm text-muted-foreground">{employee?.designation || "—"}</p> */}
							</div>

							{/* Status pill: Clocked In (light green) */}
							{todayAttendance?.clock_in && !todayAttendance.clock_out && (
								<div className="flex justify-center">
									<span className="inline-flex items-center rounded-full bg-green-100 px-4 py-1.5 text-sm font-bold text-green-800 dark:bg-green-900/40 dark:text-green-300">
										Clocked In
									</span>
								</div>
							)}

							{/* Timer: three boxes (HOURS / MINUTES / SECONDS) when clocked in; three-part current time when not */}
							<div className="flex flex-col items-center gap-2">
								{todayAttendance?.clock_in && !todayAttendance.clock_out ? (
									<>
										<div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
											{(["hours", "minutes", "seconds"] as const).map((unit) => (
												<div key={unit} className="flex flex-col items-center justify-center rounded-xl bg-white border border-border/50 py-5 px-3">
													<span className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums text-foreground">
														{getElapsedHMS(todayAttendance.clock_in!, now)[unit]}
													</span>
													<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1.5">
														{unit === "hours" ? "Hours" : unit === "minutes" ? "Minutes" : "Seconds"}
													</span>
												</div>
											))}
										</div>
										<p className="text-sm text-muted-foreground">
											Clocked in: <span className="font-semibold text-foreground">{new Date(todayAttendance.clock_in).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
										</p>
									</>
								) : todayAttendance?.clock_in && todayAttendance?.clock_out ? (
									<>
										<div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
											{(["hours", "minutes", "ampm"] as const).map((unit) => (
												<div key={unit} className="flex flex-col items-center justify-center rounded-xl bg-white border border-border/50 py-5 px-3">
													<span className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums text-foreground">
														{getCurrentTimeParts(now)[unit]}
													</span>
													<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1.5">
														{unit === "hours" ? "Hours" : unit === "minutes" ? "Minutes" : "AM/PM"}
													</span>
												</div>
											))}
										</div>
										<p className="text-sm text-muted-foreground">Current time</p>
									</>
								) : (
									<>
										<div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
											{(["hours", "minutes", "ampm"] as const).map((unit) => (
												<div key={unit} className="flex flex-col items-center justify-center rounded-xl bg-white border border-border/50 py-5 px-3">
													<span className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums text-foreground">
														{getCurrentTimeParts(now)[unit]}
													</span>
													<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1.5">
														{unit === "hours" ? "Hours" : unit === "minutes" ? "Minutes" : "AM/PM"}
													</span>
												</div>
											))}
										</div>
										<p className="text-sm text-muted-foreground">Current time</p>
									</>
								)}
							</div>

							{/* Primary action: Clock Out (red) / Clock In (blue) / Completed badge */}
							<div className="flex justify-center">
								{todayAttendance?.clock_in && !todayAttendance.clock_out ? (
									<Button onClick={handleClockOut} className="gap-3 rounded-xl bg-red-600 hover:bg-red-700 text-white px-8 py-8 text-lg font-semibold w-[100%]">
										<Square className="h-5 w-5" />
										Clock Out
									</Button>
								) : todayAttendance ? (
									<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 rounded-lg gap-1 px-4 py-2">
										<CheckCircle2 className="h-3.5 w-3.5" />
										Completed
									</Badge>
								) : (
									<Button onClick={handleClockIn} className="gap-3 rounded-xl bg-blue-600 hover:bg-primary/90 text-primary-foreground px-8 py-8 text-lg font-semibold w-[100%]">
										<Clock className="h-5 w-5" />
										Clock In
									</Button>
								)}
							</div>


							{/* Recent Attendance (unchanged functionality) */}
							<div className="space-y-2 border-t border-border/50 pt-4">
								<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Attendance</p>
								{recentAttendance.length === 0 ? (
									<p className="text-xs text-muted-foreground">No attendance records for this month yet.</p>
								) : (
									<div className="space-y-2 max-h-40 overflow-y-auto pr-1">
										{recentAttendance.map((att) => (
											<div key={att.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-white px-3 py-2.5">
												<div className="flex gap-2">
													<p className="text-xs font-medium">{new Date(att.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
													<p className="text-[11px] text-muted-foreground">{formatTime(att.clock_in)} – {formatTime(att.clock_out)}</p>
												</div>
												<div className="flex gap-2 text-right">
													<p className="text-xs font-medium capitalize">{att.status}</p>
													{att.total_hours != null && <p className="text-[11px] text-muted-foreground">{att.total_hours.toFixed(2)} hrs</p>}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Calendar with holidays / attendance highlights */}
					<Card className="rounded-2xl border-border/50 shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center justify-between text-base">
								<span className="flex items-center gap-2">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
										<Calendar className="h-5 w-5" />
									</div>
									<span className="font-semibold">Calendar</span>
								</span>
								<span className="text-xs text-muted-foreground">
									{new Date().toLocaleDateString("en-US", {
										month: "long",
										year: "numeric",
									})}
								</span>
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground'>
								{[
									"Sun",
									"Mon",
									"Tue",
									"Wed",
									"Thu",
									"Fri",
									"Sat",
								].map((d) => (
									<div key={d}>{d}</div>
								))}
							</div>
							<div className='grid grid-cols-7 gap-1 text-xs'>
								{monthDays.map((day, idx) => {
									if (!day) {
										return <div key={idx} />;
									}
									const dateStr = toLocalDateStr(day);
									const isToday = dateStr === todayStr;
									const att = monthAttendanceByDate[dateStr];
									const festivalTitles = festivalMap[dateStr];
									const hasAttendance = !!att;

									return (
										<div
											key={dateStr}
											className={`relative flex h-12 flex-col items-center justify-center rounded-md text-[11px] ${isToday
												? "bg-primary text-white font-semibold"
												: "bg-gray-100"
												}`}
											onClick={() => {
												if (festivalTitles) {
													setSelectedFestivalDate(
														dateStr
													);
												}
											}}>
											<span>{day.getDate()}</span>
											{festivalTitles && (
												<span className='mt-0.5 absolute right-1 top-1 inline-flex rounded-full bg-pink-500 text-[9px] text-pink-600 w-2 h-2'>
													
												</span>
											)}
											{!festivalTitles &&
												hasAttendance && (
													<span className='mt-0.5 inline-flex rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-600'>
														{att.status ===
															"present"
															? "Present"
															: att.status ===
																"late"
																? "Late"
																: "Leave"}
													</span>
												)}
										</div>
									);
								})}
							</div>
							{selectedFestivalDate &&
								festivalMap[selectedFestivalDate] && (
									<div className='mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs'>
										<p className='mb-1 font-medium'>
											Festivals on{" "}
											{new Date(
												selectedFestivalDate
											).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
												year: "numeric",
											})}
										</p>
										<ul className='list-disc space-y-0.5 pl-4'>
											{festivalMap[
												selectedFestivalDate
											].map((title, idx) => (
												<li key={idx}>{title}</li>
											))}
										</ul>
									</div>
								)}
						</CardContent>
					</Card>
				</div>

				{/* Stats row */}
				<div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
					<StatCard
						title='Days Worked'
						value={stats.daysWorked}
						icon={<Calendar className='h-5 w-5' />}
						description='This month'
					/>
					<StatCard
						title='Pending Leaves'
						value={stats.pendingLeaves}
						icon={<Clock className='h-5 w-5' />}
						description='Awaiting approval'
					/>
					<StatCard
						title='Approved Leaves'
						value={stats.approvedLeaves}
						icon={<CheckCircle2 className='h-5 w-5' />}
						description='This year'
					/>
					<StatCard
						title='Leave Types'
						value={totalLeaveTypes}
						icon={<CalendarDays className='h-5 w-5' />}
						description='Total leave types'
					/>
				</div>

				{/* Bottom row: Team, Birthdays, Profile */}
				<div className="grid gap-6 lg:grid-cols-3">
					{/* Team card */}
					<Card className="rounded-2xl border-border/50 shadow-sm">
						<CardHeader className="pb-2">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
									<Users className="h-5 w-5" />
								</div>
								<CardTitle className="text-base font-semibold">My Team</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="pt-0 space-y-2">
							{isTeamLoading ? (
								<p className="text-sm text-muted-foreground">Loading team...</p>
							) : teamMembers.length === 0 ? (
								<p className="text-sm text-muted-foreground rounded-xl bg-muted/20 py-8 text-center">You are not assigned to any team yet.</p>
							) : (
								<div className="space-y-2 max-h-56 overflow-y-auto pr-1">
									{teamMembers.map((m) => (
										<div
											key={m.id}
											className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${m.isSelf ? "border-primary/50 bg-primary/5" : "border-border/50 bg-card/60 hover:bg-muted/30"
												}`}>
											<Avatar className="h-8 w-8 shrink-0">
												<AvatarFallback className="text-xs bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">{m.first_name[0]}{m.last_name[0]}</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">{m.first_name} {m.last_name}</p>
												<p className="text-[11px] text-muted-foreground truncate">{m.designation || "—"}</p>
												<p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
											</div>
											<div className="flex gap-1 shrink-0">
												{m.isLeader && <Badge variant="secondary" className="text-[10px] rounded-md">Leader</Badge>}
												{m.isSelf && <Badge variant="secondary" className="text-[10px] rounded-md">You</Badge>}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Upcoming Birthdays (shared component) */}
					<UpcomingBirthdays />

					{/* Profile summary card */}
					<Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-gradient-to-b from-primary/5 to-transparent dark:from-primary/10 dark:to-transparent">
						<CardHeader className="pb-2">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
									<User className="h-5 w-5" />
								</div>
								<CardTitle className="text-base font-semibold">My Profile</CardTitle>
							</div>
						</CardHeader>
						<CardContent className='pt-0'>
							{employee ? (
								<div className='flex flex-col'>
									<div className='flex flex-col items-center text-center pb-4 border-b border-border/50'>
										<Avatar className='h-20 w-20 border-4 border-background shadow-md ring-2 ring-primary/10'>
											{employee.avatar_url ? (
												<AvatarImage
													src={employee.avatar_url}
													alt={`${employee.first_name} ${employee.last_name}`}
												/>
											) : null}
											<AvatarFallback className='bg-primary text-primary-foreground text-2xl font-semibold'>
												{employee.first_name?.[0]}
												{employee.last_name?.[0]}
											</AvatarFallback>
										</Avatar>
										<p className='font-semibold text-lg mt-3'>
											{employee.first_name}{" "}
											{employee.last_name}
										</p>
										<p className='text-sm text-muted-foreground'>
											{employee.designation || "—"}
										</p>
										{(employee.department ||
											employee.email) && (
												<p className='text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-center flex-wrap'>
													{employee.department && (
														<span className='inline-flex items-center gap-0.5'>
															<Building2 className='h-3 w-3' />
															{employee.department}
														</span>
													)}
													{employee.department &&
														employee.email && (
															<span className='text-border'>
																•
															</span>
														)}
													{employee.email && (
														<span className='inline-flex items-center gap-0.5 truncate max-w-[180px]'>
															<Mail className='h-3 w-3 shrink-0' />
															{employee.email}
														</span>
													)}
												</p>
											)}
										<Badge
											variant={
												employee.is_active
													? "default"
													: "secondary"
											}
											className={
												employee.is_active
													? "mt-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0"
													: "mt-2"
											}>
											{employee.is_active
												? "Active"
												: "Inactive"}
										</Badge>
									</div>
									<div className='space-y-2.5 pt-4'>
										{employee.joining_date && (
											<div className='flex items-center gap-2.5 text-xs'>
												<CalendarCheck className='h-4 w-4 text-muted-foreground shrink-0' />
												<span className='text-muted-foreground'>
													Joined
												</span>
												<span className='font-medium ml-auto'>
													{new Date(
														employee.joining_date
													).toLocaleDateString(
														"en-IN",
														{
															day: "numeric",
															month: "short",
															year: "numeric",
														}
													)}
												</span>
											</div>
										)}
										<Button
											variant='outline'
											size='sm'
											className='w-full mt-2'
											asChild>
											<Link
												href='/employee/profile'
												className='inline-flex items-center justify-center gap-2'>
												View full profile
												<ArrowRight className='h-3.5 w-3.5' />
											</Link>
										</Button>
									</div>
								</div>
							) : (
								<div className='flex flex-col items-center justify-center py-10 text-center'>
									<div className='h-16 w-16 animate-pulse rounded-full bg-muted mb-3' />
									<div className='h-4 w-24 animate-pulse rounded bg-muted' />
									<div className='h-3 w-20 animate-pulse rounded bg-muted/70 mt-2' />
									<p className='text-xs text-muted-foreground mt-3'>
										Loading profile...
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
