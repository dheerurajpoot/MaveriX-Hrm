"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-context";
import {
	Users,
	Clock,
	Calendar,
	Megaphone,
	CheckCircle2,
	Activity,
	UserPlus,
	ChevronLeft,
	ChevronRight,
	Timer,
	LogIn,
	Plus,
	Square,
	Building2,
	ArrowRight,
} from "lucide-react";
import type {
	Employee,
	Announcement,
	LeaveRequest,
	Team,
	Attendance,
} from "@/lib/types";

interface TeamWithDetails extends Team {
	leader?: Employee;
	team_members?: { id: string; employee?: Employee }[];
}

const statCardColors = [
	{ bg: "bg-teal-50 dark:bg-teal-950/30", iconBg: "bg-teal-500/15", icon: "text-teal-600 dark:text-teal-400" },
	{ bg: "bg-indigo-50 dark:bg-indigo-950/30", iconBg: "bg-indigo-500/15", icon: "text-indigo-600 dark:text-indigo-400" },
	{ bg: "bg-amber-50 dark:bg-amber-950/30", iconBg: "bg-amber-500/15", icon: "text-amber-600 dark:text-amber-400" },
	{ bg: "bg-rose-50 dark:bg-rose-950/30", iconBg: "bg-rose-500/15", icon: "text-rose-600 dark:text-rose-400" },
	{ bg: "bg-violet-50 dark:bg-violet-950/30", iconBg: "bg-violet-500/15", icon: "text-violet-600 dark:text-violet-400" },
];

function StatCard({
	title,
	value,
	icon,
	color,
}: {
	title: string;
	value: number;
	icon: React.ReactNode;
	color: (typeof statCardColors)[number];
}) {
	return (
		<Card className={`${color.bg} border-0 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
			<CardContent className="p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
						<p className="text-2xl font-bold mt-1 text-foreground tabular-nums">{value}</p>
					</div>
					<div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.iconBg} ${color.icon}`}>
						{icon}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function formatTime(s: string | null) {
	if (!s) return "–";
	return new Date(s).toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getElapsedHMS(clockInIso: string, toDate: Date) {
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
}

function formatCurrentTimeAMPM(d: Date) {
	return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getCurrentTimeParts(d: Date) {
	const hours12 = d.getHours() % 12 || 12;
	const ampm = d.getHours() < 12 ? "AM" : "PM";
	return {
		hours: String(hours12).padStart(2, "0"),
		minutes: String(d.getMinutes()).padStart(2, "0"),
		ampm,
	};
}

export default function HRDashboardPage() {
	const { employee } = useUser();
	const [stats, setStats] = useState({
		totalEmployees: 0,
		clockedIn: 0,
		pendingLeaves: 0,
		onLeave: 0,
		weeklyOff: 0,
	});
	const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(
		null
	);
	const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
	const [calendarMonth, setCalendarMonth] = useState(() => new Date());
	const [monthAttendance, setMonthAttendance] = useState<Attendance[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [pendingLeaves, setPendingLeaves] = useState<
		(LeaveRequest & {
			employee?: Employee;
			leave_type?: { name?: string };
		})[]
	>([]);
	const [teams, setTeams] = useState<TeamWithDetails[]>([]);
	const [todayActivities, setTodayActivities] = useState<
		(Attendance & { employee?: Employee })[]
	>([]);
	const [festivalMap, setFestivalMap] = useState<Record<string, string[]>>(
		{}
	);
	const [selectedFestivalDate, setSelectedFestivalDate] = useState<
		string | null
	>(null);
	const [now, setNow] = useState(() => new Date());

	// Fetch festivals for the displayed calendar month
	useEffect(() => {
		const fetchFestivals = async () => {
			const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
			const calendarId = "en.indian#holiday@group.v.calendar.google.com";
			if (!apiKey || !calendarId) return;

			const year = calendarMonth.getFullYear();
			const month = calendarMonth.getMonth();
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
	}, [calendarMonth]);

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const fetch = async () => {
			if (!employee) return;
			const supabase = createClient();
			const today = new Date().toISOString().split("T")[0];
			const dayOfWeek = new Date().getDay();

			// HR's own attendance
			const { data: myAtt } = await supabase
				.from("attendance")
				.select("*")
				.eq("employee_id", employee.id)
				.eq("date", today)
				.single();
			setTodayAttendance(myAtt as Attendance | null);

			// HR's recent attendance (last 5 records, current month)
			const curMonthStart = new Date().toISOString().slice(0, 8) + "01";
			const { data: recentAtt } = await supabase
				.from("attendance")
				.select("*")
				.eq("employee_id", employee.id)
				.gte("date", curMonthStart)
				.order("date", { ascending: false })
				.limit(5);
			setRecentAttendance((recentAtt as Attendance[]) || []);

			// Calendar month attendance
			const monthStart = new Date(
				calendarMonth.getFullYear(),
				calendarMonth.getMonth(),
				1
			)
				.toISOString()
				.split("T")[0];
			const monthEnd = new Date(
				calendarMonth.getFullYear(),
				calendarMonth.getMonth() + 1,
				0
			)
				.toISOString()
				.split("T")[0];
			const { data: monthAtt } = await supabase
				.from("attendance")
				.select("*")
				.eq("employee_id", employee.id)
				.gte("date", monthStart)
				.lte("date", monthEnd);
			setMonthAttendance((monthAtt as Attendance[]) || []);

			// Org stats
			const { count: empCount } = await supabase
				.from("employees")
				.select("*", { count: "exact", head: true })
				.eq("is_active", true)
				.in("role", ["employee", "hr"]);

			const { data: attData } = await supabase
				.from("attendance")
				.select("*, employee:employees(*)")
				.eq("date", today)
				.in("status", ["present", "late"]);
			const clockedIn = (attData || []).length;

			const { data: pendingData } = await supabase
				.from("leave_requests")
				.select("*, employee:employees(*), leave_type:leave_types(*)")
				.eq("status", "pending")
				.limit(10);

			const { count: leaveCount } = await supabase
				.from("leave_requests")
				.select("*", { count: "exact", head: true })
				.eq("status", "approved")
				.lte("start_date", today)
				.gte("end_date", today);

			const { data: empData } = await supabase
				.from("employees")
				.select("id")
				.eq("is_active", true)
				.neq("role", "admin")
				.eq("week_off_day", dayOfWeek);
			const weeklyOff = (empData || []).length;

			const { data: announcementsData } = await supabase
				.from("announcements")
				.select("*")
				.order("date", { ascending: false })
				.limit(10);

			const { data: teamsData } = await supabase
				.from("teams")
				.select(
					"*, leader:employees!teams_leader_id_fkey(*), team_members(*, employee:employees(*))"
				)
				.order("created_at", { ascending: false })
				.limit(8);

			const { data: activityData } = await supabase
				.from("attendance")
				.select("*, employee:employees(*)")
				.eq("date", today)
				.order("clock_in", { ascending: false })
				.limit(10);

			setStats({
				totalEmployees: empCount || 0,
				clockedIn,
				pendingLeaves: (pendingData || []).length,
				onLeave: leaveCount || 0,
				weeklyOff,
			});
			setPendingLeaves(
				(pendingData as unknown as typeof pendingLeaves) || []
			);
			setAnnouncements((announcementsData as Announcement[]) || []);
			setTeams((teamsData as unknown as TeamWithDetails[]) || []);
			setTodayActivities(
				(activityData as unknown as typeof todayActivities) || []
			);
		};
		fetch();
	}, [employee?.id, calendarMonth]);

	const handleClockIn = async () => {
		if (!employee) return;
		const supabase = createClient();
		const today = new Date().toISOString().split("T")[0];
		await supabase.from("attendance").insert({
			employee_id: employee.id,
			date: today,
			clock_in: new Date().toISOString(),
			status: "present",
		});
		const { data } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.eq("date", today)
			.single();
		setTodayAttendance(data as Attendance);
		setStats((s) => ({ ...s, clockedIn: s.clockedIn + 1 }));
	};

	const handleClockOut = async () => {
		if (!todayAttendance || !employee) return;
		const supabase = createClient();
		const now = new Date();
		const clockIn = new Date(todayAttendance.clock_in!);
		const totalHours =
			(now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
		await supabase
			.from("attendance")
			.update({ clock_out: now.toISOString(), total_hours: totalHours })
			.eq("id", todayAttendance.id);
		const { data } = await supabase
			.from("attendance")
			.select("*")
			.eq("employee_id", employee.id)
			.eq("date", new Date().toISOString().split("T")[0])
			.single();
		setTodayAttendance(data as Attendance);
		setRecentAttendance((prev) => {
			const updated = [...prev];
			const idx = updated.findIndex(
				(a) => a.date === new Date().toISOString().split("T")[0]
			);
			if (idx >= 0 && data) updated[idx] = data as Attendance;
			return updated;
		});
	};

	const handleLeaveAction = async (
		id: string,
		status: "approved" | "rejected"
	) => {
		const supabase = createClient();
		await supabase
			.from("leave_requests")
			.update({
				status,
				reviewed_by: employee?.id,
				reviewed_at: new Date().toISOString(),
			})
			.eq("id", id);
		setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
		setStats((s) => ({
			...s,
			pendingLeaves: Math.max(0, s.pendingLeaves - 1),
		}));
	};

	// Calendar grid (Sunday first, like employee dashboard)
	const calYear = calendarMonth.getFullYear();
	const calMonth = calendarMonth.getMonth();
	const firstDay = new Date(calYear, calMonth, 1);
	const lastDay = new Date(calYear, calMonth + 1, 0);
	const monthDays: (Date | null)[] = [];
	for (let i = 0; i < firstDay.getDay(); i++) monthDays.push(null);
	for (let d = 1; d <= lastDay.getDate(); d++)
		monthDays.push(new Date(calYear, calMonth, d));
	const monthAttendanceByDate: Record<string, Attendance> = {};
	for (const a of monthAttendance) monthAttendanceByDate[a.date] = a;
	const todayStr = new Date().toISOString().split("T")[0];

	return (
		<div className="flex flex-col min-h-full bg-gradient-to-b from-muted/30 to-background">
			<DashboardHeader
				title="HR Dashboard"
				description={`Welcome back, ${employee?.first_name || "HR"}`}
				searchPlaceholder="Search employees by name"
			/>

			<div className="flex-1 space-y-8 p-6">
				{/* Top: Clock (reference design) & Recent Attendance | Calendar */}
				<div className="grid gap-6 grid-cols-1 md:grid-cols-2">
					<Card className="rounded-2xl bg-gradient-to-tr from-sky-50 to-violet-100">
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
							</div>

							{/* Status pill: Clocked In */}
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

							{/* Primary action: Clock Out (red) / Clock In (blue) / Completed */}
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
									<Button onClick={handleClockIn} className="gap-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-8 text-lg font-semibold w-[100%]">
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

					<Card className="rounded-2xl border-border/50 shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center justify-between text-base">
								<span className="flex items-center gap-2">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
										<Calendar className="h-5 w-5" />
									</div>
									<span className="font-semibold">Calendar</span>
								</span>
								<div className="flex items-center gap-1">
									<Button
										variant='ghost'
										size='icon'
										className='h-8 w-8'
										onClick={() =>
											setCalendarMonth(
												(d) =>
													new Date(
														d.getFullYear(),
														d.getMonth() - 1
													)
											)
										}>
										<ChevronLeft className='h-4 w-4' />
									</Button>
									<span className='text-xs text-muted-foreground min-w-[100px] text-center'>
										{calendarMonth.toLocaleDateString(
											"en-US",
											{ month: "long", year: "numeric" }
										)}
									</span>
									<Button
										variant='ghost'
										size='icon'
										className='h-8 w-8'
										onClick={() =>
											setCalendarMonth(
												(d) =>
													new Date(
														d.getFullYear(),
														d.getMonth() + 1
													)
											)
										}>
										<ChevronRight className='h-4 w-4' />
									</Button>
								</div>
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
							<div className='grid grid-cols-7 gap-2 text-xs'>
								{monthDays.map((day, idx) => {
									if (!day) return <div key={idx} />;
									const dateStr = `${calYear}-${String(
										calMonth + 1
									).padStart(2, "0")}-${String(
										day.getDate()
									).padStart(2, "0")}`;
									const isToday = dateStr === todayStr;
									const att = monthAttendanceByDate[dateStr];
									const festivalTitles = festivalMap[dateStr];
									const hasAttendance = !!att;
									return (
										<div
											key={dateStr}
											className={`relative flex h-12 flex-col items-center justify-center rounded-md  text-[11px] cursor-default ${isToday
												? "bg-primary text-white font-semibold"
												: "bg-gray-100"
												} ${festivalTitles
													? "cursor-pointer"
													: ""
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
																: att.status ===
																	"leave"
																	? "Leave"
																	: att.status}
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

				{/* Stats */}
				<div className='grid gap-4 grid-cols-2 lg:grid-cols-5'>
					<StatCard
						title='Total Employees & HR'
						value={stats.totalEmployees}
						icon={<Users className='h-6 w-6' />}
						color={statCardColors[0]}
					/>
					<StatCard
						title='Clocked In Today'
						value={stats.clockedIn}
						icon={<Clock className='h-6 w-6' />}
						color={statCardColors[1]}
					/>
					<StatCard
						title='Pending Leaves'
						value={stats.pendingLeaves}
						icon={<Calendar className='h-6 w-6' />}
						color={statCardColors[2]}
					/>
					<StatCard
						title='On Leave Today'
						value={stats.onLeave}
						icon={<UserPlus className='h-6 w-6' />}
						color={statCardColors[3]}
					/>
					<StatCard
						title='Weekly Off Today'
						value={stats.weeklyOff}
						icon={<Calendar className='h-6 w-6' />}
						color={statCardColors[4]}
					/>
				</div>

				{/* Announcements */}
				<Card className="rounded-2xl border-border/50 shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Megaphone className="h-5 w-5" />
							</div>
							<div>
								<CardTitle className="text-base font-semibold">Announcements</CardTitle>
								<p className="text-sm text-muted-foreground mt-0.5">{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}</p>
							</div>
						</div>
						<Button size="sm" variant="outline" className="rounded-lg" asChild>
							<Link href="/hr/announcements">Manage</Link>
						</Button>
					</CardHeader>
					<CardContent className="pt-0">
						{announcements.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-muted/30">
								<Megaphone className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm font-medium">No announcements</p>
								<p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Create and manage from the announcements page</p>
								<Button size="sm" className="mt-4 rounded-lg" asChild>
									<Link href="/hr/announcements">Go to Announcements</Link>
								</Button>
							</div>
						) : (
							<div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
								{announcements.slice(0, 5).map((a) => (
									<div key={a.id} className="flex gap-3 rounded-xl p-3 hover:bg-muted/40 transition-colors">
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
											<Megaphone className="h-4 w-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium line-clamp-1">{a.title || "Announcement"}</p>
											<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
											<p className="text-xs text-muted-foreground mt-1">{a.date}</p>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Pending Approvals (if any) */}
				{pendingLeaves.length > 0 && (
					<Card className="rounded-2xl border-border/50 shadow-sm">
						<CardHeader className="pb-2">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
									<Clock className="h-5 w-5" />
								</div>
								<div>
									<CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
									<p className="text-sm text-muted-foreground mt-0.5">{pendingLeaves.length} employees waiting</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="flex flex-wrap gap-3">
								{pendingLeaves.map((leave) => (
									<div key={leave.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3 min-w-[240px] hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
										<div>
											<p className="font-medium text-sm">{leave.employee?.first_name} {leave.employee?.last_name}</p>
											<p className="text-xs text-muted-foreground">{(leave.leave_type as { name?: string })?.name ?? "Leave"} • {leave.start_date}</p>
										</div>
										<div className="flex gap-2">
											<Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleLeaveAction(leave.id, "rejected")}>Reject</Button>
											<Button size="sm" className="rounded-lg bg-primary hover:bg-primary/90" onClick={() => handleLeaveAction(leave.id, "approved")}>Approve</Button>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Bottom: Recent Activity | Recent Teams | Upcoming Birthdays */}
				<div className="grid gap-6 lg:grid-cols-3">
					<Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-gradient-to-b from-sky-50/60 to-transparent dark:from-sky-950/20 dark:to-transparent">
						<CardHeader className="pb-2">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
									<Activity className="h-5 w-5" />
								</div>
								<div>
									<CardTitle className="text-base font-semibold">Today&apos;s Activity</CardTitle>
									<p className="text-xs text-muted-foreground mt-0.5">{todayActivities.length} check-in{todayActivities.length !== 1 ? "s" : ""} today</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							{todayActivities.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-muted/20">
									<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500/70"><LogIn className="h-6 w-6" /></div>
									<p className="text-sm font-medium">No activity yet</p>
									<p className="text-xs text-muted-foreground mt-1 max-w-[180px]">Attendance check-ins will appear here</p>
								</div>
							) : (
								<ul className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
									{todayActivities.map((a) => (
										<li key={a.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-3 transition-colors hover:bg-muted/30 dark:hover:bg-muted/20">
											<Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-sm">
												{a.employee?.avatar_url ? (
													<AvatarImage className="object-cover" src={a.employee.avatar_url} alt={a.employee?.first_name} />
												) : null}
												<AvatarFallback className="text-xs font-medium bg-muted">{a.employee?.first_name?.[0]}{a.employee?.last_name?.[0]}</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium truncate">{a.employee?.first_name} {a.employee?.last_name}</p>
												<p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
													<Clock className="h-3 w-3 shrink-0" />{formatTime(a.clock_in)}
													{a.total_hours != null && <><span className="text-border">•</span><span>{a.total_hours}h</span></>}
												</p>
											</div>
											<Badge variant={a.status === "late" ? "secondary" : "default"} className={a.status === "present" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 shrink-0 rounded-md" : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 shrink-0 rounded-md"}>
												{a.status === "present" ? "Present" : "Late"}
											</Badge>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					<Card className="rounded-2xl border-border/50 shadow-sm">
						<CardHeader className="pb-2">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
									<UserPlus className="h-5 w-5" />
								</div>
								<div>
									<CardTitle className="text-base font-semibold">Recent Teams</CardTitle>
									<p className="text-sm text-muted-foreground mt-0.5">{teams.length} teams • Active groups</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							{teams.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-10 rounded-xl bg-muted/20">No teams yet</p>
							) : (
								<ul className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
									{teams.map((team) => (
										<li key={team.id} className="flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors">
											<Avatar className="h-9 w-9 shrink-0">
												{team.leader?.avatar_url ? (
													<AvatarImage className="object-cover" src={team.leader.avatar_url} alt={team.leader?.first_name} />
												) : null}
												<AvatarFallback className="text-xs bg-violet-500/15 text-violet-600 dark:text-violet-400">{team.leader?.first_name?.[0]}{team.leader?.last_name?.[0]}{!team.leader && team.name?.[0]}</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-sm truncate">{team.name}</p>
												<p className="text-xs text-muted-foreground">{team.team_members?.length || 0} members</p>
											</div>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					<UpcomingBirthdays />
				</div>
			</div>
		</div>
	);
}
