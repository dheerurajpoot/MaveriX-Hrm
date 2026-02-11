"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Calendar,
	Clock,
	Search,
	CheckCircle2,
	XCircle,
	CalendarDays,
	CalendarCheck,
	ExternalLink,
} from "lucide-react";
import type {
	Employee,
	LeaveRequest,
	LeaveType,
	LeaveBalance,
} from "@/lib/types";
import { useUser } from "../../../contexts/user-context";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface LeaveRequestWithDetails extends LeaveRequest {
	employee?: Employee;
	leave_type?: LeaveType;
}

type LeaveBalanceRow = LeaveBalance & {
	leave_type?: LeaveType;
	employee?: Employee;
};

type EmployeeYearGroup = {
	employee_id: string;
	year: number;
	employee?: Employee;
	balances: LeaveBalanceRow[];
};

export default function LeavePage() {
	const { employee: currentUser } = useUser();
	const [leaveRequests, setLeaveRequests] = useState<
		LeaveRequestWithDetails[]
	>([]);
	const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
	const [leaveBalances, setLeaveBalances] = useState<
		(LeaveBalance & { leave_type?: LeaveType; employee?: Employee })[]
	>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isLoading, setIsLoading] = useState(true);
	const [isAllotOpen, setIsAllotOpen] = useState(false);
	const [allotLoading, setAllotLoading] = useState(false);
	const [allotError, setAllotError] = useState<string | null>(null);
	const [allotForm, setAllotForm] = useState<{
		employee_ids: string[];
		year: number;
		daysByType: Record<string, string>;
	}>({
		employee_ids: [],
		year: new Date().getFullYear(),
		daysByType: {},
	});
	const [allotEmployeeSearch, setAllotEmployeeSearch] = useState("");
	const [employeeLeaveSearch, setEmployeeLeaveSearch] = useState("");
	const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
	const [typeForm, setTypeForm] = useState<{
		id: string | null;
		name: string;
		default_days: string;
		description: string;
	}>({
		id: null,
		name: "",
		default_days: "",
		description: "",
	});
	const [isSavingType, setIsSavingType] = useState(false);
	const [typeError, setTypeError] = useState<string | null>(null);

	const canApproveLeave =
		currentUser?.role === "admin" || currentUser?.role === "hr";

	const [stats, setStats] = useState({
		pending: 0,
		approved: 0,
		rejected: 0,
		total: 0,
	});

	useEffect(() => {
		fetchLeaveRequests();
		fetchLeaveTypes();
		fetchLeaveBalances();
		fetchEmployees();
	}, []);

	const fetchLeaveRequests = async () => {
		const supabase = createClient();
		const { data, error } = await supabase
			.from("leave_requests")
			.select(
				"*, employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, designation, email), leave_types(*)"
			)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Leave requests fetch error:", error);
			setIsLoading(false);
			return;
		}

		const raw = (data || []) as Record<string, unknown>[];
		const requests: LeaveRequestWithDetails[] = raw.map((row) => ({
			...row,
			employee:
				(row.employee as Employee) ??
				(row.employees as Employee) ??
				undefined,
			leave_type:
				(row.leave_type as LeaveType) ??
				(row.leave_types as LeaveType) ??
				undefined,
		})) as LeaveRequestWithDetails[];
		setLeaveRequests(requests);

		setStats({
			pending: requests.filter((r) => r.status === "pending").length,
			approved: requests.filter((r) => r.status === "approved").length,
			rejected: requests.filter((r) => r.status === "rejected").length,
			total: requests.length,
		});

		setIsLoading(false);
	};

	const fetchLeaveTypes = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("leave_types")
			.select("*")
			.eq("is_active", true)
			.order("created_at", { ascending: true });
		setLeaveTypes(data || []);
	};

	const fetchLeaveBalances = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("leave_balances")
			.select("*, leave_types(*), employees(id, first_name, last_name)")
			.order("year", { ascending: false });
		const raw = (data || []) as Record<string, unknown>[];
		const balances = raw.map((row) => ({
			...row,
			leave_type: row.leave_type ?? row.leave_types,
			employee: row.employee ?? row.employees,
		})) as (LeaveBalance & {
			leave_type?: LeaveType;
			employee?: Employee;
		})[];
		setLeaveBalances(balances);
	};

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("id, first_name, last_name, email")
			.eq("is_active", true)
			.neq("role", "admin")
			.order("first_name");
		setEmployees((data as Employee[]) || []);
	};

	// Group leave balances by employee + year for one row per employee
	const leaveBalanceGroups = useMemo((): EmployeeYearGroup[] => {
		const map = new Map<string, EmployeeYearGroup>();
		for (const bal of leaveBalances) {
			const key = `${bal.employee_id}-${bal.year}`;
			if (!map.has(key)) {
				map.set(key, {
					employee_id: bal.employee_id,
					year: bal.year,
					employee: bal.employee as Employee | undefined,
					balances: [],
				});
			}
			map.get(key)!.balances.push(bal as LeaveBalanceRow);
		}
		return Array.from(map.values()).sort((a, b) => {
			const nameA =
				(a.employee?.first_name ?? "") + (a.employee?.last_name ?? "");
			const nameB =
				(b.employee?.first_name ?? "") + (b.employee?.last_name ?? "");
			if (nameA !== nameB) return nameA.localeCompare(nameB);
			return b.year - a.year;
		});
	}, [leaveBalances]);

	const handleAllotLeave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (allotForm.employee_ids.length === 0) {
			setAllotError("Select at least one employee to allot leaves.");
			return;
		}

		const updates = Object.entries(allotForm.daysByType)
			.map(([leave_type_id, value]) => ({
				leave_type_id,
				days: parseFloat(String(value).trim()) || 0,
			}))
			.filter(({ days }) => Number.isFinite(days) && days >= 0);

		if (updates.length === 0) {
			setAllotError(
				"Enter total days for at least one leave type (or leave blank to skip)."
			);
			return;
		}

		setAllotError(null);
		setAllotLoading(true);
		const supabase = createClient();

		const rows: {
			employee_id: string;
			leave_type_id: string;
			year: number;
			total_days: number;
		}[] = [];
		for (const employee_id of allotForm.employee_ids) {
			for (const { leave_type_id, days } of updates) {
				rows.push({
					employee_id,
					leave_type_id,
					year: allotForm.year,
					total_days: Math.round(days * 100) / 100,
				});
			}
		}

		const { error } = await supabase.from("leave_balances").upsert(rows, {
			onConflict: "employee_id,leave_type_id,year",
		});
		setAllotLoading(false);
		if (error) {
			setAllotError(error.message);
			return;
		}

		setIsAllotOpen(false);
		setAllotForm({
			employee_ids: [],
			year: new Date().getFullYear(),
			daysByType: {},
		});
		setAllotEmployeeSearch("");
		await fetchLeaveBalances();
	};

	const openCreateLeaveType = () => {
		setTypeError(null);
		setTypeForm({
			id: null,
			name: "",
			default_days: "",
			description: "",
		});
		setIsTypeDialogOpen(true);
	};

	const openEditLeaveType = (type: LeaveType) => {
		setTypeError(null);
		setTypeForm({
			id: type.id,
			name: type.name,
			default_days: String(type.default_days ?? ""),
			description: type.description ?? "",
		});
		setIsTypeDialogOpen(true);
	};

	const handleSaveLeaveType = async (e: React.FormEvent) => {
		e.preventDefault();
		const days = parseInt(typeForm.default_days, 10);
		if (!typeForm.name.trim() || !Number.isFinite(days) || days < 0) {
			setTypeError("Enter a name and valid default days (0 or more).");
			return;
		}
		setIsSavingType(true);
		const supabase = createClient();
		let error;
		if (typeForm.id) {
			const { error: updErr } = await supabase
				.from("leave_types")
				.update({
					name: typeForm.name.trim(),
					default_days: days,
					description: typeForm.description || null,
				})
				.eq("id", typeForm.id);
			error = updErr;
		} else {
			const { error: insErr } = await supabase
				.from("leave_types")
				.insert({
					name: typeForm.name.trim(),
					default_days: days,
					description: typeForm.description || null,
					is_active: true,
				});
			error = insErr;
		}
		setIsSavingType(false);
		if (error) {
			setTypeError(error.message);
			return;
		}
		setIsTypeDialogOpen(false);
		await fetchLeaveTypes();
	};

	const handleDeleteLeaveType = async (type: LeaveType) => {
		if (
			!window.confirm(
				`Are you sure you want to remove leave type "${type.name}"? All allotted balances for this type will be removed and it will no longer be available.`
			)
		) {
			return;
		}
		const supabase = createClient();
		// Remove this leave type from all employees' leave balances first
		await supabase
			.from("leave_balances")
			.delete()
			.eq("leave_type_id", type.id);
		const { error } = await supabase
			.from("leave_types")
			.update({ is_active: false })
			.eq("id", type.id);
		if (error) {
			window.alert(`Could not delete leave type: ${error.message}`);
			return;
		}
		await fetchLeaveTypes();
		await fetchLeaveBalances();
	};

	const openAllotDialog = (employeeId?: string, year?: number) => {
		const initialDays: Record<string, string> = {};
		leaveTypes.forEach((t) => {
			initialDays[t.id] = "";
		});

		if (employeeId) {
			leaveTypes.forEach((t) => {
				const existing = leaveBalances.find(
					(b) =>
						b.employee_id === employeeId &&
						b.leave_type_id === t.id &&
						b.year === (year ?? new Date().getFullYear())
				);
				if (existing) {
					initialDays[t.id] = String(existing.total_days);
				}
			});
		}

		setAllotForm({
			employee_ids: employeeId ? [employeeId] : [],
			year: year ?? new Date().getFullYear(),
			daysByType: initialDays,
		});
		setAllotEmployeeSearch("");
		setAllotError(null);
		setIsAllotOpen(true);
	};

	const handleDeleteBalance = async (
		bal: LeaveBalance & { employee?: Employee; leave_type?: LeaveType }
	) => {
		if (
			!window.confirm(
				`Delete allotted ${bal.leave_type?.name ?? "leave"
				} for this employee?`
			)
		) {
			return;
		}
		const supabase = createClient();
		const { error } = await supabase
			.from("leave_balances")
			.delete()
			.eq("id", bal.id);
		if (!error) {
			await fetchLeaveBalances();
		}
	};

	const handleDeleteBalanceGroup = async (
		employeeId: string,
		year: number,
		employeeName: string
	) => {
		if (
			!window.confirm(
				`Remove all allotted leaves for ${employeeName} (${year})?`
			)
		) {
			return;
		}
		const supabase = createClient();
		const { error } = await supabase
			.from("leave_balances")
			.delete()
			.eq("employee_id", employeeId)
			.eq("year", year);
		if (!error) {
			await fetchLeaveBalances();
		}
	};

	const handleLeaveAction = async (
		requestId: string,
		status: "approved" | "rejected"
	) => {
		const supabase = createClient();
		const request = leaveRequests.find((r) => r.id === requestId);
		if (!request) return;

		await supabase
			.from("leave_requests")
			.update({
				status,
				reviewed_by: currentUser?.id,
				reviewed_at: new Date().toISOString(),
			})
			.eq("id", requestId);

		// Notify employee of status change (fire-and-forget; does not block UI)
		const emp = request.employee;
		const empEmail = emp?.email;
		if (empEmail) {
			fetch("/api/leave/notify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "status_update",
					employeeEmail: empEmail,
					employeeName:
						`${emp.first_name ?? ""} ${emp.last_name ?? ""
							}`.trim() || "Employee",
					leaveTypeName:
						(request.leave_type as { name?: string })?.name ??
						"Leave",
					startDate: request.start_date,
					endDate: request.end_date,
					status,
				}),
			}).catch(() => { });
		}

		// On approve: deduct from leave_balances (used_days supports decimals for half-day)
		if (status === "approved") {
			const days = calculateDays(
				request.start_date,
				request.end_date,
				request.half_day
			);
			const year = new Date(request.start_date).getFullYear();
			const { data: bal } = await supabase
				.from("leave_balances")
				.select("id, used_days")
				.eq("employee_id", request.employee_id)
				.eq("leave_type_id", request.leave_type_id)
				.eq("year", year)
				.single();
			if (bal) {
				const currentUsed = Number(bal.used_days) || 0;
				const newUsed = Math.round((currentUsed + days) * 100) / 100;
				await supabase
					.from("leave_balances")
					.update({ used_days: newUsed })
					.eq("id", bal.id);
			}
		}

		await fetchLeaveRequests();
		await fetchLeaveBalances();
	};

	const getFilteredRequests = (status?: string) => {
		return leaveRequests.filter((request) => {
			const matchesSearch =
				request.employee?.first_name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				request.employee?.last_name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase());
			const matchesStatus =
				!status || status === "all" ? true : request.status === status;
			const matchesFilter =
				statusFilter === "all" ? true : request.status === statusFilter;
			return matchesSearch && matchesStatus && matchesFilter;
		});
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "approved":
				return (
					<Badge className='bg-success text-success-foreground'>
						Approved
					</Badge>
				);
			case "rejected":
				return <Badge variant='destructive'>Rejected</Badge>;
			case "pending":
				return <Badge variant='secondary'>Pending</Badge>;
			default:
				return <Badge variant='outline'>{status}</Badge>;
		}
	};

	const calculateDays = (
		startDate: string,
		endDate: string,
		halfDay?: boolean | null
	) => {
		if (halfDay) return 0.5;
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
	};

	const formatLeaveDays = (
		startDate: string,
		endDate: string,
		halfDay?: boolean | null
	) => {
		const days = calculateDays(startDate, endDate, halfDay);
		return days === 0.5
			? "half day"
			: `${Math.round(days)} day${days !== 1 ? "s" : ""}`;
	};

	const formatRemainingDays = (days: number) => {
		const n = Number(days);
		if (Number.isNaN(n)) return "0";
		if (n % 1 === 0) return String(Math.round(n));
		return String(Number(n.toFixed(2)));
	};

	const renderLeaveTable = (
		requests: LeaveRequestWithDetails[],
		showActions = false
	) => (
		<div className='w-[300px] md:w-full overflow-x-auto'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Employee</TableHead>
						<TableHead>Leave Type</TableHead>
						<TableHead>Duration</TableHead>
						<TableHead>Days</TableHead>
						<TableHead>Reason</TableHead>
						<TableHead>Document</TableHead>
						<TableHead>Status</TableHead>
						{showActions && <TableHead>Actions</TableHead>}
					</TableRow>
				</TableHeader>
				<TableBody>
					{requests.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={showActions ? 8 : 7}
								className='text-center py-8'>
								<p className='text-muted-foreground'>
									No leave requests found
								</p>
							</TableCell>
						</TableRow>
					) : (
						requests.map((request) => (
							<TableRow key={request.id}>
								<TableCell>
									<div className='flex items-center gap-3'>
										<Avatar className='h-8 w-8'>
											{request.employee?.avatar_url && (
												<AvatarImage
													height={32}
													width={32}
													className='object-cover'
													src={request.employee.avatar_url}
													alt='Profile Pic'
												/>
											)}
											<AvatarFallback className='text-xs'>
												{
													request.employee
														?.first_name?.[0]
												}
												{
													request.employee
														?.last_name?.[0]
												}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className='font-medium text-sm'>
												{request.employee?.first_name}{" "}
												{request.employee?.last_name}
											</p>
											<p className='text-xs text-muted-foreground'>
												{request.employee?.designation}
											</p>
										</div>
									</div>
								</TableCell>
								<TableCell>
									<Badge variant='outline'>
										{request.leave_type?.name}
									</Badge>
								</TableCell>
								<TableCell className='text-sm'>
									<div className='flex flex-col'>
										<span>
											{new Date(
												request.start_date
											).toLocaleDateString()}
										</span>
										<span className='text-xs text-muted-foreground'>
											to{" "}
											{new Date(
												request.end_date
											).toLocaleDateString()}
										</span>
									</div>
								</TableCell>
								<TableCell>
									<Badge variant='secondary'>
										{formatLeaveDays(
											request.start_date,
											request.end_date,
											request.half_day
										)}
										{request.half_day &&
											request.half_day_period &&
											` (${request.half_day_period ===
												"first_half"
												? "9am-1pm"
												: "1pm-7pm"
											})`}
									</Badge>
								</TableCell>
								<TableCell className='max-w-[200px] truncate text-sm'>
									{request.reason || "-"}
								</TableCell>
								<TableCell>
									{request.document_url ? (
										<Button
											variant='outline'
											size='sm'
											asChild
											className='h-8'>
											<a
												href={request.document_url}
												target='_blank'
												rel='noopener noreferrer'>
												<ExternalLink className='mr-1.5 h-3.5 w-3.5' />
												View
											</a>
										</Button>
									) : (
										<span className='text-muted-foreground text-sm'>
											—
										</span>
									)}
								</TableCell>
								<TableCell>
									{getStatusBadge(request.status)}
								</TableCell>
								{showActions && (
									<TableCell>
										{request.status === "pending" &&
											canApproveLeave && (
												<div className='flex gap-2'>
													<Button
														size='sm'
														variant='outline'
														className='h-8 bg-transparent'
														onClick={() =>
															handleLeaveAction(
																request.id,
																"rejected"
															)
														}>
														<XCircle className='h-4 w-4' />
													</Button>
													<Button
														size='sm'
														className='h-8'
														onClick={() =>
															handleLeaveAction(
																request.id,
																"approved"
															)
														}>
														<CheckCircle2 className='h-4 w-4' />
													</Button>
												</div>
											)}
									</TableCell>
								)}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);

	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='Leave Management'
				description='Manage employee leave requests'
			/>

			<div className='flex-1 p-6'>
				<Tabs defaultValue='requests' className='space-y-4'>
					<TabsList className='h-12 w-full grid grid-cols-2'>
						<TabsTrigger
							value='requests'
							className='gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
							<CalendarCheck className='h-4 w-4 shrink-0' />
							<span className='truncate'>Leave Requests</span>
							{stats.pending > 0 && (
								<Badge
									variant='secondary'
									className='ml-1 h-5 min-w-5 px-1.5 data-[state=active]:bg-primary-foreground/20'>
									{stats.pending}
								</Badge>
							)}
						</TabsTrigger>
						<TabsTrigger
							value='allotment'
							className='gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
							<CalendarDays className='h-4 w-4 shrink-0' />
							<span className='truncate'>
								Allotment & Leave Types
							</span>
						</TabsTrigger>
					</TabsList>
					<TabsContent value='requests' className='mt-4 space-y-4'>
						<div className='grid gap-4 grid-cols-2 md:grid-cols-4'>
							<StatCard
								title='Pending Requests'
								value={stats.pending}
								icon={<Clock className='h-5 w-5' />}
								className='border-l-4 border-l-warning'
							/>
							<StatCard
								title='Approved'
								value={stats.approved}
								icon={<CheckCircle2 className='h-5 w-5' />}
								className='border-l-4 border-l-success'
							/>
							<StatCard
								title='Rejected'
								value={stats.rejected}
								icon={<XCircle className='h-5 w-5' />}
								className='border-l-4 border-l-destructive'
							/>
							<StatCard
								title='Total Requests'
								value={stats.total}
								icon={<CalendarDays className='h-5 w-5' />}
							/>
						</div>

						{/* Filters */}
						<Card>
							<CardContent className='flex flex-wrap items-center gap-4 p-4'>
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
								<Select
									value={statusFilter}
									onValueChange={setStatusFilter}>
									<SelectTrigger className='w-[150px]'>
										<SelectValue placeholder='Filter status' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>
											All Status
										</SelectItem>
										<SelectItem value='pending'>
											Pending
										</SelectItem>
										<SelectItem value='approved'>
											Approved
										</SelectItem>
										<SelectItem value='rejected'>
											Rejected
										</SelectItem>
									</SelectContent>
								</Select>
							</CardContent>
						</Card>

						{/* Tabs */}
						<Tabs defaultValue='pending' className='space-y-4'>
							<TabsList>
								<TabsTrigger value='pending' className='gap-2'>
									<Clock className='h-4 w-4' />
									Pending ({stats.pending})
								</TabsTrigger>
								<TabsTrigger value='all' className='gap-2'>
									<CalendarCheck className='h-4 w-4' />
									All Requests
								</TabsTrigger>
							</TabsList>

							<TabsContent value='pending'>
								<Card>
									<CardHeader>
										<CardTitle className='flex items-center gap-2'>
											<Calendar className='h-5 w-5' />
											Pending Leave Requests
										</CardTitle>
									</CardHeader>
									<CardContent>
										{isLoading ? (
											<div className='flex items-center justify-center py-8'>
												<p className='text-muted-foreground'>
													Loading...
												</p>
											</div>
										) : (
											renderLeaveTable(
												getFilteredRequests("pending"),
												true
											)
										)}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent value='all'>
								<Card>
									<CardHeader>
										<CardTitle className='flex items-center gap-2'>
											<Calendar className='h-5 w-5' />
											All Leave Requests
										</CardTitle>
									</CardHeader>
									<CardContent>
										{isLoading ? (
											<div className='flex items-center justify-center py-8'>
												<p className='text-muted-foreground'>
													Loading...
												</p>
											</div>
										) : (
											renderLeaveTable(
												getFilteredRequests()
											)
										)}
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</TabsContent>

					<TabsContent value='allotment' className='mt-4 space-y-6'>
						{/* Leave Types Management - MOVED TO TOP */}
						<Card>
							<CardHeader className='flex flex-row items-center justify-between'>
								<div>
									<CardTitle className='text-base'>
										Leave Types
									</CardTitle>
									<p className='text-xs text-muted-foreground'>
										Configure leave types available to all
										employees.
									</p>
								</div>
								{canApproveLeave && (
									<Button
										size='sm'
										onClick={openCreateLeaveType}>
										Add Leave Type
									</Button>
								)}
							</CardHeader>
							<CardContent>
								{leaveTypes.length === 0 ? (
									<p className='text-sm text-muted-foreground'>
										No leave types defined yet.
									</p>
								) : (
									<div className='grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5'>
										{leaveTypes.map((type) => (
											<Card
												key={type.id}
												className='overflow-hidden border border-border/50 hover:shadow-md transition-shadow'>
												<CardContent className='p-4 space-y-2'>
													<div className='text-center'>
														<h4 className='font-semibold text-sm truncate'>
															{type.name}
														</h4>
														<p className='mt-2 text-3xl font-bold text-primary'>
															{type.default_days}
														</p>
														<p className='text-xs text-muted-foreground'>
															days / year
														</p>
														{type.description && (
															<p className='mt-2 text-[11px] text-muted-foreground line-clamp-2'>
																{type.description}
															</p>
														)}
													</div>
													{canApproveLeave && (
														<div className='flex justify-center gap-1.5 pt-2 border-t border-border/50'>
															<Button
																size='sm'
																variant='outline'
																className='h-7 text-xs'
																onClick={() =>
																	openEditLeaveType(
																		type
																	)
																}>
																Edit
															</Button>
															<Button
																size='sm'
																variant='ghost'
																className='h-7 text-xs text-destructive hover:text-destructive'
																onClick={() =>
																	handleDeleteLeaveType(
																		type
																	)
																}>
																Delete
															</Button>
														</div>
													)}
												</CardContent>
											</Card>
										))}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Total Leaves (Allotted by Employee) - MOVED TO BOTTOM */}
						<Card>
							<CardHeader className='flex flex-row items-center justify-between'>
								<CardTitle className='text-base'>
									Total Leaves (Allotted by Employee)
								</CardTitle>
								{canApproveLeave && (
									<Button
										size='sm'
										onClick={() => openAllotDialog()}>
										<CalendarDays className='mr-2 h-4 w-4' />
										Allot Leaves
									</Button>
								)}
							</CardHeader>
							<CardContent className='space-y-4'>
								{/* Search Box */}
								{leaveBalanceGroups.length > 0 && (
									<div className='relative'>
										<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
										<Input
											placeholder='Search employees...'
											value={employeeLeaveSearch}
											onChange={(e) =>
												setEmployeeLeaveSearch(e.target.value)
											}
											className='pl-9'
										/>
									</div>
								)}

								{leaveBalanceGroups.length === 0 ? (
									<p className='text-sm text-muted-foreground'>
										No leave balances yet. Allot leaves to
										employees above.
									</p>
								) : (
									<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
										{leaveBalanceGroups
											.filter((group) => {
												const name =
													group.employee
														?.first_name &&
														group.employee
															?.last_name
														? `${group.employee.first_name} ${group.employee.last_name}`
														: group.employee_id;
												return name
													.toLowerCase()
													.includes(
														employeeLeaveSearch.toLowerCase()
													);
											})
											.map((group) => {
												const name =
													group.employee
														?.first_name &&
														group.employee
															?.last_name
														? `${group.employee.first_name} ${group.employee.last_name}`
														: group.employee_id;
												return (
													<Card key={`${group.employee_id}-${group.year}`} className='overflow-hidden border border-border/50 hover:shadow-md transition-shadow'>
														<CardContent className='p-3 space-y-3'>
															{/* Employee Header */}
															<div className='pb-2 border-b border-border/50'>
																<h4 className='font-semibold text-sm truncate'>
																	{name}
																</h4>
																<p className='text-xs text-muted-foreground'>
																	Year: {group.year}
																</p>
															</div>

															{/* Allocated Leaves */}
															<div className='space-y-1.5'>
																<p className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium'>Allocated Leaves</p>
																<div className='space-y-1.5'>
																	{group.balances.map(
																		(
																			bal
																		) => {
																			const remaining =
																				bal.total_days -
																				bal.used_days;
																			const typeName =
																				(
																					bal.leave_type as LeaveType
																				)
																					?.name ??
																				"Leave";
																			return (
																				<div
																					key={
																						bal.id
																					}
																					className='flex items-center justify-between p-1.5 rounded bg-muted/30'>
																					<div className='flex-1 min-w-0'>
																						<p className='text-xs font-medium truncate'>
																							{typeName}
																						</p>
																						<p className='text-[10px] text-muted-foreground'>
																							{formatRemainingDays(
																								remaining
																							)}{" "}
																							remaining
																						</p>
																					</div>
																					<div className='text-right'>
																						<p className='text-base font-bold text-primary'>
																							{formatRemainingDays(
																								remaining
																							)}
																						</p>
																						<p className='text-[9px] text-muted-foreground'>
																							of {bal.total_days}
																						</p>
																					</div>
																				</div>
																			);
																		}
																	)}
																</div>
															</div>

															{/* Actions */}
															{canApproveLeave && (
																<div className='flex gap-1.5 pt-2 border-t border-border/50'>
																	<Button
																		size='sm'
																		variant='outline'
																		className='flex-1 h-7 text-xs'
																		onClick={() =>
																			openAllotDialog(
																				group.employee_id,
																				group.year
																			)
																		}>
																		Edit
																	</Button>
																	<Button
																		size='sm'
																		variant='ghost'
																		className='flex-1 h-7 text-xs text-destructive hover:text-destructive'
																		onClick={() =>
																			handleDeleteBalanceGroup(
																				group.employee_id,
																				group.year,
																				name
																			)
																		}>
																		Delete
																	</Button>
																</div>
															)}
														</CardContent>
													</Card>
												);
											})}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Allot Leaves Dialog */}
				{canApproveLeave && (
					<Dialog open={isAllotOpen} onOpenChange={setIsAllotOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Allot Leaves</DialogTitle>
								<DialogDescription>
									Set or update leave type balances for one or
									more employees for a year.
								</DialogDescription>
							</DialogHeader>
							<form
								onSubmit={handleAllotLeave}
								className='space-y-4'>
								<div className='space-y-2'>
									<Label>Employees</Label>
									<div className='rounded-md border border-border bg-muted/30'>
										<div className='flex items-center gap-2 border-b border-border px-3 py-2'>
											<Search className='h-4 w-4 shrink-0 text-muted-foreground' />
											<Input
												placeholder='Search and select employee(s)...'
												value={allotEmployeeSearch}
												onChange={(e) =>
													setAllotEmployeeSearch(
														e.target.value
													)
												}
												className='h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0'
											/>
										</div>
										<div className='max-h-44 overflow-y-auto p-1'>
											{employees
												.filter(
													(emp) =>
														!allotEmployeeSearch.trim() ||
														`${emp.first_name ?? ""
															} ${emp.last_name ?? ""
															} ${emp.email ?? ""}`
															.toLowerCase()
															.includes(
																allotEmployeeSearch.toLowerCase()
															)
												)
												.map((emp) => {
													const selected =
														allotForm.employee_ids.includes(
															emp.id
														);
													return (
														<button
															key={emp.id}
															type='button'
															onClick={() =>
																setAllotForm(
																	(f) => ({
																		...f,
																		employee_ids:
																			selected
																				? f.employee_ids.filter(
																					(
																						id
																					) =>
																						id !==
																						emp.id
																				)
																				: [
																					...f.employee_ids,
																					emp.id,
																				],
																	})
																)
															}
															className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${selected
																? "bg-primary/15 text-primary"
																: "hover:bg-muted/80"
																}`}>
															<span
																className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected
																	? "border-primary bg-primary"
																	: "border-muted-foreground"
																	}`}>
																{selected && (
																	<CheckCircle2 className='h-3 w-3 text-primary-foreground' />
																)}
															</span>
															<span className='truncate'>
																{emp.first_name}{" "}
																{emp.last_name}
															</span>
															{emp.email && (
																<span className='truncate text-xs text-muted-foreground'>
																	{emp.email}
																</span>
															)}
														</button>
													);
												})}
										</div>
									</div>
									{allotForm.employee_ids.length > 0 && (
										<div className='flex flex-wrap gap-1.5'>
											{allotForm.employee_ids.map(
												(id) => {
													const emp = employees.find(
														(e) => e.id === id
													);
													if (!emp) return null;
													return (
														<Badge
															key={id}
															variant='secondary'
															className='gap-1 pr-1'>
															{emp.first_name}{" "}
															{emp.last_name}
															<button
																type='button'
																onClick={() =>
																	setAllotForm(
																		(
																			f
																		) => ({
																			...f,
																			employee_ids:
																				f.employee_ids.filter(
																					(
																						eid
																					) =>
																						eid !==
																						id
																				),
																		})
																	)
																}
																className='ml-0.5 rounded-full p-0.5 hover:bg-muted'>
																<XCircle className='h-3 w-3' />
															</button>
														</Badge>
													);
												}
											)}
										</div>
									)}
								</div>
								<div className='space-y-2'>
									<Label>Year</Label>
									<Input
										type='number'
										min={new Date().getFullYear() - 1}
										max={new Date().getFullYear() + 1}
										value={allotForm.year}
										onChange={(e) =>
											setAllotForm((f) => ({
												...f,
												year:
													parseInt(
														e.target.value,
														10
													) ||
													new Date().getFullYear(),
											}))
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label>Leave Types &amp; Total Days</Label>
									<div className='max-h-64 space-y-3 overflow-y-auto pr-1'>
										{leaveTypes.map((t) => {
											const existingBalance =
												allotForm.employee_ids
													.length === 1
													? leaveBalances.find(
														(b) =>
															b.employee_id ===
															allotForm
																.employee_ids[0] &&
															b.year ===
															allotForm.year &&
															b.leave_type_id ===
															t.id
													)
													: null;
											const totalEntered = parseFloat(
												String(
													allotForm.daysByType[
													t.id
													] ?? ""
												).trim()
											);
											const totalDays = Number.isFinite(
												totalEntered
											)
												? totalEntered
												: Number(
													existingBalance?.total_days ??
													0
												);
											const usedDays = Number(
												existingBalance?.used_days ?? 0
											);
											const remaining =
												Math.round(
													(totalDays - usedDays) * 100
												) / 100;
											return (
												<div
													key={t.id}
													className='flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2'>
													<div className='flex-1 min-w-0'>
														<p className='text-sm font-medium truncate'>
															{t.name}
														</p>
														<p className='text-[11px] text-muted-foreground'>
															Default{" "}
															{t.default_days}{" "}
															days/year
															{allotForm
																.employee_ids
																.length === 1 &&
																(existingBalance !=
																	null ||
																	allotForm
																		.daysByType[
																	t.id
																	]) && (
																	<>
																		{" · "}
																		Remaining:{" "}
																		{formatRemainingDays(
																			remaining
																		)}
																	</>
																)}
														</p>
													</div>
													<Input
														type='number'
														min={0}
														step='0.5'
														className='w-24'
														value={
															allotForm
																.daysByType[
															t.id
															] ?? ""
														}
														onChange={(e) =>
															setAllotForm(
																(f) => ({
																	...f,
																	daysByType:
																	{
																		...f.daysByType,
																		[t.id]:
																			e
																				.target
																				.value,
																	},
																})
															)
														}
														placeholder='0'
													/>
												</div>
											);
										})}
									</div>
									<p className='text-[11px] text-muted-foreground'>
										Leave blank to skip a leave type. Use
										decimals for half-days (e.g. 0.5).
									</p>
								</div>
								{allotError && (
									<p className='text-sm text-destructive'>
										{allotError}
									</p>
								)}
								<div className='flex justify-end gap-2'>
									<Button
										type='button'
										variant='outline'
										onClick={() => setIsAllotOpen(false)}>
										Cancel
									</Button>
									<Button
										type='submit'
										disabled={
											allotLoading ||
											allotForm.employee_ids.length === 0
										}>
										{allotLoading ? "Saving..." : "Allot"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				)}

				{/* Leave Type Add / Edit Dialog */}
				{canApproveLeave && (
					<Dialog
						open={isTypeDialogOpen}
						onOpenChange={setIsTypeDialogOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{typeForm.id
										? "Edit Leave Type"
										: "Add Leave Type"}
								</DialogTitle>
								<DialogDescription>
									Set up leave types that can be allotted to
									all employees.
								</DialogDescription>
							</DialogHeader>
							<form
								onSubmit={handleSaveLeaveType}
								className='space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='lt-name'>Name</Label>
									<Input
										id='lt-name'
										value={typeForm.name}
										onChange={(e) =>
											setTypeForm((f) => ({
												...f,
												name: e.target.value,
											}))
										}
										placeholder='e.g. Casual Leave'
										required
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='lt-days'>
										Default Days / Year
									</Label>
									<Input
										id='lt-days'
										type='number'
										min={0}
										value={typeForm.default_days}
										onChange={(e) =>
											setTypeForm((f) => ({
												...f,
												default_days: e.target.value,
											}))
										}
										placeholder='e.g. 12'
										required
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='lt-desc'>
										Description (optional)
									</Label>
									<Textarea
										id='lt-desc'
										value={typeForm.description}
										onChange={(e) =>
											setTypeForm((f) => ({
												...f,
												description: e.target.value,
											}))
										}
										placeholder='Short description visible to admins.'
									/>
								</div>
								{typeError && (
									<p className='text-sm text-destructive'>
										{typeError}
									</p>
								)}
								<div className='flex justify-end gap-2'>
									<Button
										type='button'
										variant='outline'
										onClick={() =>
											setIsTypeDialogOpen(false)
										}>
										Cancel
									</Button>
									<Button
										type='submit'
										disabled={isSavingType}>
										{isSavingType
											? "Saving..."
											: typeForm.id
												? "Update Type"
												: "Create Type"}
									</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</div>
		</div >
	);
}
