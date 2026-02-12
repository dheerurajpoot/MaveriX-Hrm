"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-context";
import {
	Users,
	Clock,
	Calendar,
	Megaphone,
	CheckCircle,
	Activity,
	UserPlus,
	LogIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export default function AdminDashboardPage() {
	const { employee } = useUser();
	const [stats, setStats] = useState({
		totalEmployees: 0,
		clockedIn: 0,
		pendingLeaves: 0,
		onLeave: 0,
		weeklyOff: 0,
	});
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [pendingLeaves, setPendingLeaves] = useState<
		(LeaveRequest & { employee?: Employee })[]
	>([]);
	const [teams, setTeams] = useState<TeamWithDetails[]>([]);
	const [todayActivities, setTodayActivities] = useState<
		(Attendance & { employee?: Employee })[]
	>([]);
	function todayLocalStr() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
			2,
			"0"
		)}-${String(d.getDate()).padStart(2, "0")}`;
	}

	useEffect(() => {
		const fetchData = async () => {
			const supabase = createClient();
			const today = todayLocalStr();
			const dayOfWeek = new Date().getDay();

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

			const { data: pendingData } = await supabase
				.from("leave_requests")
				.select(
					"*, employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name), leave_types(*)"
				)
				.eq("status", "pending")
				.order("created_at", { ascending: false })
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
				.eq("week_off_day", dayOfWeek);

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
				clockedIn: (attData || []).length,
				pendingLeaves: (pendingData || []).length,
				onLeave: leaveCount || 0,
				weeklyOff: (empData || []).length,
			});
			const rawPending = (pendingData || []) as Record<string, unknown>[];
			setPendingLeaves(
				rawPending.map((row) => ({
					...row,
					employee:
						(row.employee as Employee) ??
						(row.employees as Employee) ??
						undefined,
					leave_type:
						(row.leave_type as { name?: string }) ??
						(row.leave_types as { name?: string }) ??
						undefined,
				})) as (LeaveRequest & { employee?: Employee })[]
			);
			setAnnouncements((announcementsData as Announcement[]) || []);
			setTeams((teamsData as TeamWithDetails[]) || []);
			setTodayActivities(
				(activityData as (Attendance & { employee?: Employee })[]) || []
			);
		};
		fetchData();
	}, []);

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

	const formatTime = (s: string | null) =>
		s
			? new Date(s).toLocaleTimeString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
			  })
			: "-";

	return (
		<div className="flex flex-col min-h-full bg-gradient-to-b from-muted/30 to-background">
			<DashboardHeader
				title="Admin Dashboard"
				description={`Welcome back, ${employee?.first_name || "Admin"}`}
			/>

			<div className="flex-1 space-y-8 p-6">
				{/* Stats Cards */}
				<div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
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
						title='Pending Leave Requests'
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

				{/* Announcements | Pending Leave Requests */}
				<div className="grid gap-6 lg:grid-cols-2">
					<Card className="rounded-2xl border-border/50 shadow-sm">
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
									<Megaphone className="h-5 w-5" />
								</div>
								<div>
									<CardTitle className="text-base font-semibold">Announcements</CardTitle>
									<p className="text-sm text-muted-foreground mt-0.5">
										{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
									</p>
								</div>
							</div>
							<Button size="sm" variant="outline" className="rounded-lg" asChild>
								<Link href="/admin/announcements">Manage</Link>
							</Button>
						</CardHeader>
						<CardContent className="pt-0">
							{announcements.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-muted/30">
									<Megaphone className="h-10 w-10 text-muted-foreground/50 mb-3" />
									<p className="text-sm font-medium">No announcements</p>
									<p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Create and manage from the announcements page</p>
									<Button size="sm" className="mt-4 rounded-lg" asChild>
										<Link href="/admin/announcements">Go to Announcements</Link>
									</Button>
								</div>
							) : (
								<div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
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

					<Card className="rounded-2xl border-border/50 shadow-sm">
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
									<Calendar className="h-5 w-5" />
								</div>
								<div>
									<CardTitle className="text-base font-semibold">Pending Leave Requests</CardTitle>
									<p className="text-sm text-muted-foreground mt-0.5">
										{pendingLeaves.length} request{pendingLeaves.length !== 1 ? "s" : ""} awaiting approval
									</p>
								</div>
							</div>
							{pendingLeaves.length > 0 && (
								<Button size="sm" variant="outline" className="rounded-lg" asChild>
									<Link href="/admin/leave">View all</Link>
								</Button>
							)}
						</CardHeader>
						<CardContent className="pt-0">
							{pendingLeaves.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-muted/30">
									<CheckCircle className="h-10 w-10 text-emerald-500/50 mb-3" />
									<p className="text-sm font-medium">No pending requests</p>
									<p className="text-xs text-muted-foreground mt-1">Leave requests will appear here</p>
								</div>
							) : (
								<div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
									{pendingLeaves.map((leave) => (
										<div key={leave.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-3 hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium truncate">{leave.employee?.first_name} {leave.employee?.last_name}</p>
												<p className="text-xs text-muted-foreground">{leave.leave_type?.name ?? "Leave"} • {leave.start_date} to {leave.end_date}</p>
											</div>
											<div className="flex shrink-0 gap-2">
												<Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleLeaveAction(leave.id, "rejected")}>Reject</Button>
												<Button size="sm" className="rounded-lg bg-primary hover:bg-primary/90" onClick={() => handleLeaveAction(leave.id, "approved")}>Approve</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Recent Activity | Teams | Birthdays */}
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
									<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500/70">
										<LogIn className="h-6 w-6" />
									</div>
									<p className="text-sm font-medium">No activity yet</p>
									<p className="text-xs text-muted-foreground mt-1 max-w-[180px]">Attendance check-ins will appear here</p>
								</div>
							) : (
								<ul className="space-y-2 max-h-[370px] overflow-y-auto pr-1">
									{todayActivities.map((a) => (
										<li key={a.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-3 transition-colors hover:bg-muted/30 dark:hover:bg-muted/20">
											<Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-sm">
												{a?.employee?.avatar_url && (
																<AvatarImage height={32} width={32} className="object-cover"
																	src={a.employee.avatar_url}
																	alt={`${a.employee.first_name} ${a.employee.last_name}`}
																/>
															)}
												<AvatarFallback className="text-xs font-medium bg-muted">{a.employee?.first_name?.[0]}{a.employee?.last_name?.[0]}</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium truncate">{a.employee?.first_name} {a.employee?.last_name}</p>
												<p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
													<Clock className="h-3 w-3 shrink-0" />
													{formatTime(a.clock_in)}
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
									<CardTitle className="text-base font-semibold">Teams</CardTitle>
									<p className="text-sm text-muted-foreground mt-0.5">{teams.length} team{teams.length !== 1 ? "s" : ""}</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							{teams.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-10 rounded-xl bg-muted/20">No teams yet</p>
							) : (
								<ul className="space-y-2 max-h-[370px] overflow-y-auto pr-1">
									{teams.map((team) => (
										<li key={team.id} className="flex items-center gap-3 rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors">
											<Avatar className="h-9 w-9 shrink-0">
												{team.leader?.avatar_url && (
																<AvatarImage height={32} width={32} className="object-cover"
																	src={team.leader.avatar_url}
																	alt="Profile Pic"
																/>
															)}
												
												<AvatarFallback className="text-xs bg-violet-500/15 text-violet-600 dark:text-violet-400">{team.leader?.first_name?.[0]}{team.leader?.last_name?.[0]}{!team.leader && team.name?.[0]}</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium truncate">{team.name}</p>
												<p className="text-xs text-muted-foreground">{team.team_members?.length ?? 0} members</p>
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
