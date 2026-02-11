"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/settings-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Calendar,
	Clock,
	Search,
	UserCheck,
	UserX,
	Timer,
	Coffee,
	CalendarOff,
	Zap,
	Loader2,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import type { Attendance, Employee } from "@/lib/types";
import { applyLatePolicyForAllEmployees } from "./actions";
import { toast } from "react-hot-toast";

interface AttendanceWithEmployee extends Attendance {
	employee?: Employee;
}

/** Local date as YYYY-MM-DD (avoids UTC shift for "today" and time checks). */
function toLocalDateStr(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		"0"
	)}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AttendancePage() {
	const { settings, isLoading: settingsLoading } = useSettings();
	const [attendanceRecords, setAttendanceRecords] = useState<
		AttendanceWithEmployee[]
	>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [selectedDate, setSelectedDate] = useState(() =>
		toLocalDateStr(new Date())
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isLoading, setIsLoading] = useState(true);
	const [applyingPolicy, setApplyingPolicy] = useState(false);

	useEffect(() => {
		if (settingsLoading || !settings) return;
		let cancelled = false;
		(async () => {
			await fetchAttendance();
			if (cancelled) return;
			await fetchEmployees();
			if (cancelled) return;
			await autoClockOutUnmarked();
		})();
		return () => {
			cancelled = true;
		};
	}, [selectedDate, settings, settingsLoading]);

	const fetchAttendance = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("attendance")
			.select("*, employee:employees(*)")
			.eq("date", selectedDate)
			.order("clock_in", { ascending: false });

		const records = (data as unknown as AttendanceWithEmployee[]) || [];
		setAttendanceRecords(records);
		setIsLoading(false);
	};

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("*")
			.eq("is_active", true)
			.neq("role", "admin");
		setEmployees(data || []);
	};

	// Auto clock-out records that have clock_in but no clock_out when viewing today after auto_clock_out_time
	const autoClockOutUnmarked = async () => {
		if (!settings?.auto_clock_out_time) return;
		const today = toLocalDateStr(new Date());
		if (
			selectedDate !== today ||
			!isNowAfterTime(selectedDate, settings.auto_clock_out_time)
		) {
			return;
		}
		const supabase = createClient();
		const { data: unclosed } = await supabase
			.from("attendance")
			.select("id, clock_in")
			.eq("date", selectedDate)
			.not("clock_in", "is", null)
			.is("clock_out", null);
		if (!unclosed?.length) return;
		const clockOutAt = getDateAtTime(
			selectedDate,
			settings.auto_clock_out_time
		);
		const clockOutDate = new Date(clockOutAt);
		for (const r of unclosed) {
			const clockIn = new Date(r.clock_in);
			const totalHours =
				(clockOutDate.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
			await supabase
				.from("attendance")
				.update({
					clock_out: clockOutAt,
					total_hours: parseFloat(totalHours.toFixed(2)),
				})
				.eq("id", r.id);
		}
		await fetchAttendance();
	};

	const handleClockOut = async (attendanceId: string) => {
		const supabase = createClient();
		const now = new Date();

		// Get the attendance record to calculate total hours
		const record = attendanceRecords.find((r) => r.id === attendanceId);
		if (!record?.clock_in) return;

		const clockIn = new Date(record.clock_in);
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
			.eq("id", attendanceId);

		await fetchAttendance();
	};

	const handleApplyLatePolicy = async () => {
		setApplyingPolicy(true);
		try {
			const now = new Date();
			const year = now.getFullYear();
			const month = now.getMonth() + 1;
			const result = await applyLatePolicyForAllEmployees(year, month);
			if (result.success) {
				toast.success(result.message);
			} else {
				toast.error(result.message);
			}
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to apply policy"
			);
		} finally {
			setApplyingPolicy(false);
		}
	};

	// Helper functions for date navigation
	const goToPreviousDay = () => {
		const currentDate = new Date(selectedDate);
		currentDate.setDate(currentDate.getDate() - 1);
		setSelectedDate(toLocalDateStr(currentDate));
	};

	const goToNextDay = () => {
		const currentDate = new Date(selectedDate);
		const today = toLocalDateStr(new Date());
		currentDate.setDate(currentDate.getDate() + 1);
		const newDate = toLocalDateStr(currentDate);
		// Don't allow going beyond today
		if (newDate <= today) {
			setSelectedDate(newDate);
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "present":
				return (
					<Badge className='bg-success text-success-foreground'>
						Present
					</Badge>
				);
			case "absent":
				return <Badge variant='destructive'>Absent</Badge>;
			case "late":
				return (
					<Badge className='bg-warning text-warning-foreground'>
						Late
					</Badge>
				);
			case "leave":
				return <Badge variant='secondary'>On Leave</Badge>;
			case "week_off":
				return <Badge variant='outline'>Week Off</Badge>;
			default:
				return <Badge variant='outline'>{status}</Badge>;
		}
	};

	const formatTime = (timeString: string | null) => {
		if (!timeString) return "-";
		return new Date(timeString).toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Parse "11:00 AM" / "7:00 PM" to hours and minutes (24h)
	function parseTime12h(str: string): { hours: number; minutes: number } {
		const [time, period] = str.trim().split(/\s+/);
		const [h, m] = time.split(":").map((n) => parseInt(n, 10) || 0);
		let hours = h;
		if (period?.toUpperCase() === "PM" && h !== 12) hours += 12;
		if (period?.toUpperCase() === "AM" && h === 12) hours = 0;
		return { hours, minutes: m };
	}

	// Build ISO string for dateStr at time e.g. "7:30 PM" in local timezone (no UTC shift)
	function getDateAtTime(dateStr: string, timeStr: string): string {
		const [y, mo, da] = dateStr.split("-").map(Number);
		const { hours, minutes } = parseTime12h(timeStr);
		const d = new Date(y, mo - 1, da, hours, minutes, 0, 0);
		return d.toISOString();
	}

	// True if current time is after the given time on the given date
	function isNowAfterTime(dateStr: string, timeStr: string): boolean {
		return new Date() > new Date(getDateAtTime(dateStr, timeStr));
	}

	// Selected date day-of-week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
	const selectedDayOfWeek = new Date(selectedDate).getDay();
	const isEmployeeWeekOff = (emp: Employee) =>
		emp.week_off_day != null && emp.week_off_day === selectedDayOfWeek;

	// Build one row per employee: use attendance record if exists, else week off or absent
	type RowRecord = AttendanceWithEmployee & { _synthetic?: boolean };
	const allEmployeeRows: RowRecord[] = employees.map((emp) => {
		const existing = attendanceRecords.find(
			(r) => r.employee_id === emp.id
		);
		if (existing) {
			return { ...existing, employee: emp, _synthetic: false };
		}
		if (isEmployeeWeekOff(emp)) {
			return {
				id: `wo-${emp.id}`,
				employee_id: emp.id,
				date: selectedDate,
				clock_in: null,
				clock_out: null,
				total_hours: null,
				status: "week_off" as const,
				notes: null,
				created_at: "",
				updated_at: "",
				employee: emp,
				_synthetic: true,
			};
		}
		return {
			id: `abs-${emp.id}`,
			employee_id: emp.id,
			date: selectedDate,
			clock_in: null,
			clock_out: null,
			total_hours: null,
			status: "absent" as const,
			notes: null,
			created_at: "",
			updated_at: "",
			employee: emp,
			_synthetic: true,
		};
	});

	// Stats from full roster (all employees for the day)
	const stats = {
		present: allEmployeeRows.filter((r) => r.status === "present").length,
		absent: allEmployeeRows.filter((r) => r.status === "absent").length,
		late: allEmployeeRows.filter((r) => r.status === "late").length,
		onLeave: allEmployeeRows.filter((r) => r.status === "leave").length,
		weekOff: allEmployeeRows.filter((r) => r.status === "week_off").length,
	};

	const filteredRecords: RowRecord[] = allEmployeeRows.filter((record) => {
		const matchesSearch =
			record.employee?.first_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			record.employee?.last_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesStatus =
			statusFilter === "all" || record.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	// Format date display
	const dateDisplay = new Date(selectedDate + "T12:00:00").toLocaleDateString(
		"en-US",
		{
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric",
		}
	);

	// Check if next button should be disabled
	const today = toLocalDateStr(new Date());
	const isToday = selectedDate === today;

	if (settingsLoading || !settings) {
		return (
			<div className='flex min-h-screen items-center justify-center'>
				<Loader2 className='h-8 w-8 animate-spin text-primary' />
			</div>
		);
	}

	return (
		<div className='flex flex-col min-h-screen bg-background'>
			<DashboardHeader
				title='Attendance Management'
				description='Track and manage employee attendance records'
			/>

			<div className='flex-1 space-y-6 p-4 md:p-6 pb-20 md:pb-6'>
				{/* Date Navigation */}
				<Card className='border-none shadow-sm'>
					<CardContent className='p-6'>
						<div className='flex items-center justify-between gap-4'>
							<Button
								variant='outline'
								size='icon'
								onClick={goToPreviousDay}
								className='h-9 w-9 shrink-0'>
								<ChevronLeft className='h-4 w-4' />
							</Button>
							<div className='flex items-center gap-3 flex-1 justify-center'>
								<Calendar className='h-5 w-5 text-muted-foreground' />
								<h2 className='text-xl font-semibold tracking-tight text-center'>
									{dateDisplay}
								</h2>
							</div>
							<Button
								variant='outline'
								size='icon'
								onClick={goToNextDay}
								disabled={isToday}
								className='h-9 w-9 shrink-0'>
								<ChevronRight className='h-4 w-4' />
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Stats Cards */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-5'>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										Present
									</p>
									<div className='h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center'>
										<UserCheck className='h-4 w-4 text-success' />
									</div>
								</div>
								<p className='text-3xl font-bold text-success'>
									{stats.present}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										Absent
									</p>
									<div className='h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center'>
										<UserX className='h-4 w-4 text-destructive' />
									</div>
								</div>
								<p className='text-3xl font-bold text-destructive'>
									{stats.absent}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										Late
									</p>
									<div className='h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center'>
										<Timer className='h-4 w-4 text-warning' />
									</div>
								</div>
								<p className='text-3xl font-bold text-warning'>
									{stats.late}
								</p>
								{settings && (
									<p className='text-[10px] text-muted-foreground leading-tight'>
										After {settings.max_late_days} lates/month, {settings.late_policy_deduction_per_day} day deducted
									</p>
								)}
							</div>
						</CardContent>
					</Card>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										Week Off
									</p>
									<div className='h-8 w-8 rounded-lg bg-muted flex items-center justify-center'>
										<CalendarOff className='h-4 w-4 text-muted-foreground' />
									</div>
								</div>
								<p className='text-3xl font-bold'>
									{stats.weekOff}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card className='border-none shadow-sm hover:shadow-md transition-shadow'>
						<CardContent className='p-5'>
							<div className='space-y-2'>
								<div className='flex items-center justify-between'>
									<p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
										On Leave
									</p>
									<div className='h-8 w-8 rounded-lg bg-muted flex items-center justify-center'>
										<Coffee className='h-4 w-4 text-muted-foreground' />
									</div>
								</div>
								<p className='text-3xl font-bold'>
									{stats.onLeave}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Filters */}
				<Card className='border-none shadow-sm'>
					<CardContent className='space-y-4 p-6'>
						<div className='flex flex-wrap items-center gap-4'>
							<div className='relative flex-1 min-w-[200px]'>
								<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									placeholder='Search employees...'
									value={searchQuery}
									onChange={(e) =>
										setSearchQuery(e.target.value)
									}
									className='pl-9'
								/>
							</div>
							<Button
								onClick={handleApplyLatePolicy}
								disabled={applyingPolicy}
								variant='outline'
								className='gap-2'>
								{applyingPolicy ? (
									<Loader2 className='h-4 w-4 animate-spin' />
								) : (
									<Zap className='h-4 w-4' />
								)}
								{applyingPolicy
									? "Applying..."
									: "Apply Late Policy"}
							</Button>
						</div>
						<Tabs
							value={statusFilter}
							onValueChange={setStatusFilter}
							className='w-full'>
							<TabsList className='flex flex-wrap h-auto gap-1 bg-muted/50 p-1'>
								<TabsTrigger
									value='all'
									className='data-[state=active]:bg-background'>
									All
								</TabsTrigger>
								<TabsTrigger
									value='present'
									className='data-[state=active]:bg-success/70 data-[state=active]:text-success-foreground'>
									Present ({stats.present})
								</TabsTrigger>
								<TabsTrigger
									value='late'
									className='data-[state=active]:bg-warning/70 data-[state=active]:text-warning-foreground'>
									Late ({stats.late})
								</TabsTrigger>
								<TabsTrigger
									value='week_off'
									className='data-[state=active]:bg-muted'>
									Week Off ({stats.weekOff})
								</TabsTrigger>
								<TabsTrigger
									value='absent'
									className='data-[state=active]:bg-destructive/15 data-[state=active]:text-destructive'>
									Absent ({stats.absent})
								</TabsTrigger>
								<TabsTrigger
									value='leave'
									className='data-[state=active]:bg-muted'>
									On Leave ({stats.onLeave})
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</CardContent>
				</Card>

				{/* Attendance Records Table */}
				<Card className='border-none shadow-sm'>
					<CardHeader className='pb-4'>
						<CardTitle className='text-lg font-semibold flex items-center gap-2'>
							<Clock className='h-5 w-5' />
							Attendance Records
						</CardTitle>
						<p className='text-sm text-muted-foreground'>
							All employees for the selected date
						</p>
					</CardHeader>
					<CardContent className='px-0 pb-0'>
						{isLoading ? (
							<div className='py-16 text-center'>
								<div className='inline-flex items-center gap-2 text-muted-foreground'>
									<div className='h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent' />
									<span>Loading attendance data...</span>
								</div>
							</div>
						) : filteredRecords.length === 0 ? (
							<div className='py-16 text-center text-muted-foreground'>
								<Calendar className='h-12 w-12 mx-auto mb-3 opacity-50' />
								<p>No employees match the filters</p>
							</div>
						) : (
							<div className='overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow className='hover:bg-transparent border-t'>
											<TableHead className='font-semibold'>Employee</TableHead>
											<TableHead className='font-semibold'>Status</TableHead>
											<TableHead className='font-semibold'>Clock In</TableHead>
											<TableHead className='font-semibold'>Clock Out</TableHead>
											<TableHead className='font-semibold'>Hours</TableHead>
											<TableHead className='font-semibold'>Action</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredRecords.map((record) => (
											<TableRow
												key={record.id}
												className='hover:bg-muted/50 transition-colors'>
												<TableCell>
													<div className='flex items-center gap-3'>
														<Avatar className='h-9 w-9'>
															{record.employee?.avatar_url && (
																<AvatarImage height={32} width={32} className="object-cover"
																	src={record.employee.avatar_url}
																	alt="Profile Pic"
																/>
															)}
															<AvatarFallback className='text-xs bg-primary/10 text-primary'>
																{
																	record
																		.employee
																		?.first_name?.[0]
																}
																{
																	record
																		.employee
																		?.last_name?.[0]
																}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className='font-medium text-sm'>
																{
																	record
																		.employee
																		?.first_name
																}{" "}
																{
																	record
																		.employee
																		?.last_name
																}
															</p>
															<p className='text-xs text-muted-foreground'>
																{
																	record
																		.employee
																		?.designation
																}
															</p>
														</div>
													</div>
												</TableCell>
												<TableCell>
													{getStatusBadge(
														record.status
													)}
												</TableCell>
												<TableCell className='text-sm tabular-nums text-muted-foreground'>
													{formatTime(
														record.clock_in
													)}
												</TableCell>
												<TableCell className='text-sm tabular-nums text-muted-foreground'>
													{formatTime(
														record.clock_out
													)}
												</TableCell>
												<TableCell className='text-sm tabular-nums font-medium'>
													{record.total_hours
														? `${record.total_hours}h`
														: "-"}
												</TableCell>
												<TableCell>
													{!record._synthetic &&
														record.clock_in &&
														!record.clock_out && (
															<Button
																size='sm'
																variant='outline'
																onClick={() =>
																	handleClockOut(
																		record.id
																	)
																}>
																Clock Out
															</Button>
														)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
