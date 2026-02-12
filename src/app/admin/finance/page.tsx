"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
	DollarSign,
	Plus,
	Search,
	TrendingUp,
	CreditCard,
	Wallet,
	Receipt,
	FileText,
	ExternalLink,
	Download,
} from "lucide-react";
import type { FinanceRecord, Employee } from "@/lib/types";
import { useUser } from "../../../contexts/user-context";
import { toast } from "react-hot-toast";
import { SalarySlipDownload } from "@/components/salary-slip/salary-slip-download";
import { companyConfig } from "@/lib/constant";

interface FinanceWithEmployee extends FinanceRecord {
	employee?: Employee;
}

export default function FinancePage() {
	const { employee: currentUser } = useUser();
	const [records, setRecords] = useState<FinanceWithEmployee[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isAllocateSlipDialogOpen, setIsAllocateSlipDialogOpen] =
		useState(false);
	const [selectedEmployeesForSlip, setSelectedEmployeesForSlip] = useState<
		string[]
	>([]);
	const [slipEmployeeSearch, setSlipEmployeeSearch] = useState("");
	const [allocateSlipMonth, setAllocateSlipMonth] = useState(
		new Date().getMonth() + 1
	);
	const [allocateSlipYear, setAllocateSlipYear] = useState(
		new Date().getFullYear()
	);

	const [formData, setFormData] = useState({
		employee_id: "",
		amount: "",
		type: "salary",
		description: "",
		month: new Date().getMonth() + 1,
		year: new Date().getFullYear(),
	});
	const [formError, setFormError] = useState<string | null>(null);
	const [addRecordEmployeeSearch, setAddRecordEmployeeSearch] = useState("");

	const [stats, setStats] = useState({
		totalSalary: 0,
		totalBonus: 0,
		totalDeductions: 0,
		pending: 0,
	});

	useEffect(() => {
		fetchRecords();
		fetchEmployees();
	}, []);

	const fetchRecords = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("finance_records")
			.select(
				"*, employee:employees!finance_records_employee_id_fkey(id, first_name, last_name, avatar_url, designation, email)"
			)
			.order("year", { ascending: false })
			.order("month", { ascending: false })
			.order("created_at", { ascending: false });

		const financeRecords = (data as unknown as FinanceWithEmployee[]) || [];
		setRecords(financeRecords);

		const currentYear = new Date().getFullYear();
		const currentMonth = new Date().getMonth() + 1;
		const thisMonthRecords = financeRecords.filter(
			(r) => r.year === currentYear && r.month === currentMonth
		);

		setStats({
			totalSalary: thisMonthRecords
				.filter((r) => r.type === "salary")
				.reduce((sum, r) => sum + Number(r.amount), 0),
			totalBonus: thisMonthRecords
				.filter((r) => r.type === "bonus")
				.reduce((sum, r) => sum + Number(r.amount), 0),
			totalDeductions: thisMonthRecords
				.filter((r) => r.type === "deduction")
				.reduce((sum, r) => sum + Number(r.amount), 0),
			pending: financeRecords.filter((r) => r.status === "pending")
				.length,
		});

		setIsLoading(false);
	};

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select(
				"id, first_name, last_name, email, avatar_url, designation, adhar_url, pan_url, bank_name, bank_account_number, bank_ifsc, bank_location, aadhar_number, pan_number"
			)
			.eq("is_active", true)
			.neq("role", "admin")
			.order("first_name");
		setEmployees((data as Employee[]) || []);
	};


	const filteredEmployeesForDocs = employees.filter((emp) => {
		const matchesSearch =
			emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			emp.email?.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	const handleCreateRecord = async () => {
		setFormError(null);
		const supabase = createClient();

		if (formData.type === "salary") {
			const { data: existing } = await supabase
				.from("finance_records")
				.select("id")
				.eq("employee_id", formData.employee_id)
				.eq("month", formData.month)
				.eq("year", formData.year)
				.eq("type", "salary")
				.limit(1);
			if (existing?.length) {
				toast.error(
					"This employee already has a salary allocated for this month."
				);
				setFormError(
					"This employee already has a salary allocated for this month."
				);
				return;
			}
		}

		const { error } = await supabase.from("finance_records").insert({
			employee_id: formData.employee_id,
			amount: parseFloat(formData.amount),
			type: formData.type,
			description: formData.description,
			month: formData.month,
			year: formData.year,
			created_by: currentUser?.id,
		});

		if (!error) {
			await fetchRecords();
			setIsAddDialogOpen(false);
			setFormData({
				employee_id: "",
				amount: "",
				type: "salary",
				description: "",
				month: new Date().getMonth() + 1,
				year: new Date().getFullYear(),
			});
		}
	};

	const handleMarkPaid = async (recordId: string) => {
		const supabase = createClient();

		await supabase
			.from("finance_records")
			.update({
				status: "paid",
				paid_at: new Date().toISOString(),
			})
			.eq("id", recordId);

		await fetchRecords();
	};

	const handleAllocateSalarySlips = async () => {
		if (selectedEmployeesForSlip.length === 0) {
			toast.error("Please select at least one employee");
			return;
		}

		const supabase = createClient();

		// Update salary_slip_allocated to true for selected employees' salary records
		// for the specified month and year
		const { error } = await supabase
			.from("finance_records")
			.update({ salary_slip_allocated: true })
			.in("employee_id", selectedEmployeesForSlip)
			.eq("month", allocateSlipMonth)
			.eq("year", allocateSlipYear)
			.eq("type", "salary");

		if (error) {
			toast.error("Failed to allocate salary slips: " + error.message);
			return;
		}

		toast.success(
			`Salary slips allocated for ${selectedEmployeesForSlip.length} employee(s)`
		);
		setIsAllocateSlipDialogOpen(false);
		setSelectedEmployeesForSlip([]);
		setSlipEmployeeSearch("");
		await fetchRecords();
	};

	// Get employees who have salary records for the selected month/year
	const employeesWithSalaryForPeriod = employees.filter((emp) => {
		return records.some(
			(r) =>
				r.employee_id === emp.id &&
				r.type === "salary" &&
				r.month === allocateSlipMonth &&
				r.year === allocateSlipYear
		);
	});

	const filteredRecords = records.filter((record) => {
		const matchesSearch =
			record.employee?.first_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			record.employee?.last_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesType = typeFilter === "all" || record.type === typeFilter;
		return matchesSearch && matchesType;
	});

	const getTypeBadge = (type: string) => {
		switch (type) {
			case "salary":
				return <Badge className='bg-primary'>Salary</Badge>;
			case "bonus":
				return (
					<Badge className='bg-success text-success-foreground'>
						Bonus
					</Badge>
				);
			case "deduction":
				return <Badge variant='destructive'>Deduction</Badge>;
			case "reimbursement":
				return <Badge variant='secondary'>Reimbursement</Badge>;
			default:
				return <Badge variant='outline'>{type}</Badge>;
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "paid":
				return (
					<Badge className='bg-success text-success-foreground'>
						Paid
					</Badge>
				);
			case "pending":
				return <Badge variant='secondary'>Pending</Badge>;
			case "cancelled":
				return <Badge variant='destructive'>Cancelled</Badge>;
			default:
				return <Badge variant='outline'>{status}</Badge>;
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "INR",
		}).format(amount);
	};

	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='Finance'
				description='Manage financial records'
			/>

			<div className='flex-1 space-y-6 p-6'>
				{/* Stats */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-4'>
					<StatCard
						title='Total Salaries'
						value={formatCurrency(stats.totalSalary)}
						icon={<Wallet className='h-5 w-5' />}
						description='This month'
					/>
					<StatCard
						title='Total Bonuses'
						value={formatCurrency(stats.totalBonus)}
						icon={<TrendingUp className='h-5 w-5' />}
						description='This month'
					/>
					<StatCard
						title='Deductions'
						value={formatCurrency(stats.totalDeductions)}
						icon={<CreditCard className='h-5 w-5' />}
						description='This month'
					/>
					<StatCard
						title='Pending Payments'
						value={stats.pending}
						icon={<Receipt className='h-5 w-5' />}
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
								onChange={(e) => setSearchQuery(e.target.value)}
								className='pl-9'
							/>
						</div>
						<Select
							value={typeFilter}
							onValueChange={setTypeFilter}>
							<SelectTrigger className='w-[150px]'>
								<SelectValue placeholder='Filter type' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>All Types</SelectItem>
								<SelectItem value='salary'>Salary</SelectItem>
								<SelectItem value='bonus'>Bonus</SelectItem>
								<SelectItem value='deduction'>
									Deduction
								</SelectItem>
								<SelectItem value='reimbursement'>
									Reimbursement
								</SelectItem>
							</SelectContent>
						</Select>
						<Dialog
							open={isAllocateSlipDialogOpen}
							onOpenChange={(open) => {
								setIsAllocateSlipDialogOpen(open);
								if (!open) {
									setSelectedEmployeesForSlip([]);
									setSlipEmployeeSearch("");
								}
							}}>
							<DialogTrigger asChild>
								<Button variant='outline'>
									<FileText className='mr-2 h-4 w-4' />
									Allocate Salary Slips
								</Button>
							</DialogTrigger>
							<DialogContent className='max-w-2xl'>
								<DialogHeader>
									<DialogTitle>
										Allocate Salary Slips
									</DialogTitle>
									<DialogDescription>
										Select employees and month/year to
										allocate salary slip download access
									</DialogDescription>
								</DialogHeader>
								<div className='space-y-4 py-4'>
									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-2'>
											<Label>Month</Label>
											<Select
												value={allocateSlipMonth.toString()}
												onValueChange={(value) =>
													setAllocateSlipMonth(
														parseInt(value)
													)
												}>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{months.map(
														(month, idx) => (
															<SelectItem
																key={month}
																value={(
																	idx + 1
																).toString()}>
																{month}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>
										</div>
										<div className='space-y-2'>
											<Label>Year</Label>
											<Input
												type='number'
												value={allocateSlipYear}
												onChange={(e) =>
													setAllocateSlipYear(
														parseInt(e.target.value)
													)
												}
											/>
										</div>
									</div>
									<div className='space-y-2'>
										<Label>
											Select Employees (with salary
											records for this period)
										</Label>
										<div className='rounded-md border border-border bg-muted/30'>
											<div className='flex items-center gap-2 border-b border-border px-3 py-2'>
												<Search className='h-4 w-4 shrink-0 text-muted-foreground' />
												<Input
													placeholder='Search employees...'
													value={slipEmployeeSearch}
													onChange={(e) =>
														setSlipEmployeeSearch(
															e.target.value
														)
													}
													className='h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0'
												/>
											</div>
											<div className='max-h-64 overflow-y-auto p-1'>
												{employeesWithSalaryForPeriod
													.filter(
														(emp) =>
															!slipEmployeeSearch.trim() ||
															`${emp.first_name ??
																""
																} ${emp.last_name ??
																""
																} ${emp.email ?? ""
																}`
																.toLowerCase()
																.includes(
																	slipEmployeeSearch.toLowerCase()
																)
													)
													.map((emp) => {
														const isSelected =
															selectedEmployeesForSlip.includes(
																emp.id
															);
														const salaryRecord =
															records.find(
																(r) =>
																	r.employee_id ===
																	emp.id &&
																	r.type ===
																	"salary" &&
																	r.month ===
																	allocateSlipMonth &&
																	r.year ===
																	allocateSlipYear
															);
														const isAllocated =
															salaryRecord?.salary_slip_allocated;

														return (
															<button
																key={emp.id}
																type='button'
																onClick={() => {
																	setSelectedEmployeesForSlip(
																		(
																			prev
																		) =>
																			prev.includes(
																				emp.id
																			)
																				? prev.filter(
																					(
																						id
																					) =>
																						id !==
																						emp.id
																				)
																				: [
																					...prev,
																					emp.id,
																				]
																	);
																}}
																className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${isSelected
																	? "bg-primary/15 text-primary"
																	: "hover:bg-muted/80"
																	}`}>
																<span
																	className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected
																		? "border-primary bg-primary"
																		: "border-muted-foreground"
																		}`}>
																	{isSelected && (
																		<span className='h-2 w-2 rounded-full bg-primary-foreground' />
																	)}
																</span>
																<span className='truncate'>
																	{
																		emp.first_name
																	}{" "}
																	{
																		emp.last_name
																	}
																</span>
																{emp.email && (
																	<span className='truncate text-xs text-muted-foreground'>
																		{
																			emp.email
																		}
																	</span>
																)}
																{isAllocated && (
																	<Badge
																		variant='outline'
																		className='ml-auto text-xs'>
																		Already
																		Allocated
																	</Badge>
																)}
															</button>
														);
													})}
												{employeesWithSalaryForPeriod.filter(
													(emp) =>
														!slipEmployeeSearch.trim() ||
														`${emp.first_name ?? ""
															} ${emp.last_name ?? ""
															} ${emp.email ?? ""}`
															.toLowerCase()
															.includes(
																slipEmployeeSearch.toLowerCase()
															)
												).length === 0 && (
														<p className='p-4 text-center text-sm text-muted-foreground'>
															No employees with salary
															records for this period
														</p>
													)}
											</div>
										</div>
										{selectedEmployeesForSlip.length >
											0 && (
												<p className='text-xs text-muted-foreground'>
													Selected:{" "}
													{
														selectedEmployeesForSlip.length
													}{" "}
													employee(s)
												</p>
											)}
									</div>
									<div className='flex justify-end gap-3 pt-4'>
										<Button
											variant='outline'
											onClick={() =>
												setIsAllocateSlipDialogOpen(
													false
												)
											}>
											Cancel
										</Button>
										<Button
											onClick={handleAllocateSalarySlips}
											disabled={
												selectedEmployeesForSlip.length ===
												0
											}>
											Allocate Slips
										</Button>
									</div>
								</div>
							</DialogContent>
						</Dialog>
						<Dialog
							open={isAddDialogOpen}
							onOpenChange={(open) => {
								setIsAddDialogOpen(open);
								if (!open) setAddRecordEmployeeSearch("");
								if (!open) setFormError(null);
							}}>
							<DialogTrigger asChild>
								<Button>
									<Plus className='mr-2 h-4 w-4' />
									Add Record
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										Add Finance Record
									</DialogTitle>
									<DialogDescription>
										Create a new salary, bonus, or deduction
										record
									</DialogDescription>
								</DialogHeader>
								<div className='space-y-4 py-4'>
									<div className='space-y-2'>
										<Label>Employee</Label>
										<div className='rounded-md border border-border bg-muted/30'>
											<div className='flex items-center gap-2 border-b border-border px-3 py-2'>
												<Search className='h-4 w-4 shrink-0 text-muted-foreground' />
												<Input
													placeholder='Search employee...'
													value={
														addRecordEmployeeSearch
													}
													onChange={(e) =>
														setAddRecordEmployeeSearch(
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
															!addRecordEmployeeSearch.trim() ||
															`${emp.first_name ??
																""
																} ${emp.last_name ??
																""
																} ${emp.email ?? ""
																}`
																.toLowerCase()
																.includes(
																	addRecordEmployeeSearch.toLowerCase()
																)
													)
													.map((emp) => {
														const selected =
															formData.employee_id ===
															emp.id;
														return (
															<button
																key={emp.id}
																type='button'
																onClick={() => {
																	const next =
																	{
																		...formData,
																		employee_id:
																			emp.id,
																	};
																	const hasExisting =
																		records.some(
																			(
																				r
																			) =>
																				r.employee_id ===
																				emp.id &&
																				r.month ===
																				formData.month &&
																				r.year ===
																				formData.year &&
																				r.type ===
																				"salary"
																		);
																	if (
																		hasExisting &&
																		formData.type ===
																		"salary"
																	)
																		next.type =
																			"bonus";
																	setFormData(
																		next
																	);
																}}
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
																		<span className='h-2 w-2 rounded-full bg-primary-foreground' />
																	)}
																</span>
																<span className='truncate'>
																	{
																		emp.first_name
																	}{" "}
																	{
																		emp.last_name
																	}
																</span>
																{emp.email && (
																	<span className='truncate text-xs text-muted-foreground'>
																		{
																			emp.email
																		}
																	</span>
																)}
															</button>
														);
													})}
											</div>
										</div>
										{formData.employee_id && (
											<p className='text-xs text-muted-foreground'>
												Selected:{" "}
												{
													employees.find(
														(e) =>
															e.id ===
															formData.employee_id
													)?.first_name
												}{" "}
												{
													employees.find(
														(e) =>
															e.id ===
															formData.employee_id
													)?.last_name
												}
											</p>
										)}
									</div>
									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-2'>
											<Label>Type</Label>
											<Select
												value={formData.type}
												onValueChange={(value) =>
													setFormData({
														...formData,
														type: value,
													})
												}>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='salary'>
														Salary
													</SelectItem>
													<SelectItem value='bonus'>
														Bonus
													</SelectItem>
													<SelectItem value='deduction'>
														Deduction
													</SelectItem>
													<SelectItem value='reimbursement'>
														Reimbursement
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className='space-y-2'>
											<Label>Amount</Label>
											<Input
												type='number'
												placeholder='0.00'
												value={formData.amount}
												onChange={(e) =>
													setFormData({
														...formData,
														amount: e.target.value,
													})
												}
											/>
										</div>
									</div>
									<div className='grid grid-cols-2 gap-4'>
										<div className='space-y-2'>
											<Label>Month</Label>
											<Select
												value={formData.month.toString()}
												onValueChange={(value) => {
													const next = {
														...formData,
														month: parseInt(value),
													};
													const hasExisting =
														formData.employee_id &&
														records.some(
															(r) =>
																r.employee_id ===
																formData.employee_id &&
																r.month ===
																parseInt(
																	value
																) &&
																r.year ===
																formData.year &&
																r.type ===
																"salary"
														);
													if (
														hasExisting &&
														formData.type ===
														"salary"
													)
														next.type = "bonus";
													setFormData(next);
												}}>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{months.map(
														(month, idx) => (
															<SelectItem
																key={month}
																value={(
																	idx + 1
																).toString()}>
																{month}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>
										</div>
										<div className='space-y-2'>
											<Label>Year</Label>
											<Input
												type='number'
												value={formData.year}
												onChange={(e) => {
													const year = parseInt(
														e.target.value
													);
													const next = {
														...formData,
														year,
													};
													const hasExisting =
														formData.employee_id &&
														records.some(
															(r) =>
																r.employee_id ===
																formData.employee_id &&
																r.month ===
																formData.month &&
																r.year ===
																year &&
																r.type ===
																"salary"
														);
													if (
														hasExisting &&
														formData.type ===
														"salary"
													)
														next.type = "bonus";
													setFormData(next);
												}}
											/>
										</div>
									</div>
									<div className='space-y-2'>
										<Label>Description</Label>
										<Input
											placeholder='Optional description...'
											value={formData.description}
											onChange={(e) =>
												setFormData({
													...formData,
													description: e.target.value,
												})
											}
										/>
									</div>
									{formError && (
										<p className='text-sm text-destructive'>
											{formError}
										</p>
									)}
									<div className='flex justify-end gap-3 pt-4'>
										<Button
											variant='outline'
											onClick={() =>
												setIsAddDialogOpen(false)
											}>
											Cancel
										</Button>
										<Button
											onClick={handleCreateRecord}
											disabled={
												!formData.employee_id ||
												!formData.amount
											}>
											Create Record
										</Button>
									</div>
								</div>
							</DialogContent>
						</Dialog>
					</CardContent>
				</Card>

				{/* Records Table */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<DollarSign className='h-5 w-5' />
							Finance Records
						</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className='flex items-center justify-center py-8'>
								<p className='text-muted-foreground'>
									Loading...
								</p>
							</div>
						) : filteredRecords.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-8'>
								<p className='text-muted-foreground'>
									No finance records found
								</p>
							</div>
						) : (
							<div className='w-[300px] md:w-full overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Employee</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead>Period</TableHead>
											<TableHead>Description</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Slip</TableHead>
											<TableHead>Action</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredRecords.map((record) => (
											<TableRow key={record.id}>
												<TableCell>
													<div className='flex items-center gap-3'>
														<Avatar className='h-8 w-8'>
															{record.employee?.avatar_url && (
																<AvatarImage height={32} width={32} className="object-cover"
																	src={record.employee.avatar_url}
																	alt="Profile Pic"
																/>
															)}
															<AvatarFallback className='text-xs'>
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
													{getTypeBadge(record.type)}
												</TableCell>
												<TableCell className='font-medium'>
													{formatCurrency(
														record.amount
													)}
												</TableCell>
												<TableCell className='text-sm'>
													{record.month && record.year
														? `${months[
														record.month -
														1
														]
														} ${record.year}`
														: "-"}
												</TableCell>
												<TableCell className='max-w-[150px] truncate text-sm'>
													{record.description || "-"}
												</TableCell>
												<TableCell>
													{getStatusBadge(
														record.status
													)}
												</TableCell>
												<TableCell>
													{record.type === "salary" &&
														record.salary_slip_allocated && (
															<SalarySlipDownload
																data={{
																	company: {
																		name: companyConfig.name,
																		logoUrl:
																			companyConfig.logoUrl,
																		address:
																			companyConfig.address,
																	},
																	employee: {
																		name: `${record
																			.employee
																			?.first_name ??
																			""
																			} ${record
																				.employee
																				?.last_name ??
																			""
																			}`.trim(),
																		dateOfJoining:
																			record
																				.employee
																				?.joining_date
																				? String(
																					new Date(
																						record.employee.joining_date
																					).getFullYear()
																				)
																				: undefined,
																		department:
																			record
																				.employee
																				?.designation ??
																			undefined,
																		address:
																			record
																				.employee
																				?.address ??
																			undefined,
																	},
																	month:
																		record.month ??
																		1,
																	year:
																		record.year ??
																		new Date().getFullYear(),
																	bank: {
																		bankName:
																			record
																				.employee
																				?.bank_name ??
																			undefined,
																		accountNo:
																			record
																				.employee
																				?.bank_account_number ??
																			undefined,
																		panNo:
																			record
																				.employee
																				?.pan_number ??
																			undefined,
																	},
																	earnings: [
																		{
																			component:
																				"Basic",
																			full: Number(
																				record.amount
																			),
																			actual: Number(
																				record.amount
																			),
																		},
																	],
																	deductions:
																		records
																			.filter(
																				(
																					r
																				) =>
																					r.employee_id ===
																					record.employee_id &&
																					r.type ===
																					"deduction" &&
																					r.month ===
																					record.month &&
																					r.year ===
																					record.year
																			)
																			.map(
																				(
																					d
																				) => ({
																					component:
																						d.description ||
																						"Deduction",
																					amount: Number(
																						d.amount
																					),
																				})
																			),
																	totalDeductions:
																		records
																			.filter(
																				(
																					r
																				) =>
																					r.employee_id ===
																					record.employee_id &&
																					r.type ===
																					"deduction" &&
																					r.month ===
																					record.month &&
																					r.year ===
																					record.year
																			)
																			.reduce(
																				(
																					sum,
																					r
																				) =>
																					sum +
																					Number(
																						r.amount
																					),
																				0
																			),
																	netPay:
																		Number(
																			record.amount
																		) -
																		records
																			.filter(
																				(
																					r
																				) =>
																					r.employee_id ===
																					record.employee_id &&
																					r.type ===
																					"deduction" &&
																					r.month ===
																					record.month &&
																					r.year ===
																					record.year
																			)
																			.reduce(
																				(
																					sum,
																					r
																				) =>
																					sum +
																					Number(
																						r.amount
																					),
																				0
																			),
																}}
																trigger={
																	<Button
																		variant='ghost'
																		size='sm'>
																		<Download className='mr-2 h-4 w-4' />
																		Download
																	</Button>
																}
															/>
														)}
													{record.type === "salary" &&
														!record.salary_slip_allocated && (
															<Badge variant='secondary'>
																Not Allocated
															</Badge>
														)}
												</TableCell>
												<TableCell>
													{record.status ===
														"pending" && (
															<Button
																size='sm'
																variant='outline'
																onClick={() =>
																	handleMarkPaid(
																		record.id
																	)
																}>
																Mark Paid
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

				{/* Employee Documents & Salary – all employees, documents + salary or docs only */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<FileText className='h-5 w-5' />
							Employee Documents
						</CardTitle>
						<CardDescription>
							View all employees’ Aadhar/PAN documents and latest
							allotted salary (all statuses). One salary per
							employee per month. After that, add
							bonus/deduction/reimbursement.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{filteredEmployeesForDocs.length === 0 ? (
							<p className='text-sm text-muted-foreground py-4'>
								No employees found.
							</p>
						) : (
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
								{filteredEmployeesForDocs.map((emp) => {
									const adharUrl = emp.adhar_url;
									const panUrl = emp.pan_url;
									const aadharNo = emp.aadhar_number;
									const panNo = emp.pan_number;

									return (
										<Card key={emp.id} className='overflow-hidden border border-border/50 hover:shadow-md transition-shadow'>
											<CardContent className='p-5 space-y-4'>
												{/* Employee Header */}
												<div className='flex items-center gap-3 pb-3 border-b border-border/50'>
													<Avatar className='h-12 w-12 shrink-0'>
														{emp.avatar_url ? (
															<AvatarImage className="object-cover"
																src={emp.avatar_url}
																alt={`${emp.first_name} ${emp.last_name}`}
															/>
														) : null}
														<AvatarFallback className='bg-primary text-primary-foreground'>
															{emp.first_name?.[0]}{emp.last_name?.[0]}
														</AvatarFallback>
													</Avatar>
													<div className='flex-1 min-w-0'>
														<h4 className='font-semibold text-base truncate'>
															{emp.first_name} {emp.last_name}
														</h4>
														<p className='text-xs text-muted-foreground truncate'>
															{emp.employee_id || "—"}
														</p>
													</div>
												</div>

												{/* Email */}
												<div className='space-y-1'>
													<p className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium'>Email</p>
													<p className='text-sm font-medium truncate'>{emp.email || "—"}</p>
												</div>

												{/* Documents Section */}
												<div className='space-y-2'>
													<p className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium'>Documents</p>
													<div className='grid grid-cols-2 gap-2'>
														{/* Aadhar */}
														<div className='space-y-1.5'>
															<p className='text-xs text-muted-foreground'>Aadhar</p>
															{adharUrl ? (
																<Button
																	variant='outline'
																	size='sm'
																	className='w-full'
																	asChild>
																	<a
																		href={adharUrl}
																		target='_blank'
																		rel='noopener noreferrer'>
																		<ExternalLink className='mr-1.5 h-3.5 w-3.5' />
																		View
																	</a>
																</Button>
															) : (
																<p className='text-xs text-muted-foreground px-2 py-1.5 bg-muted/30 rounded text-center'>
																	No doc
																</p>
															)}
															<p className='text-xs font-mono truncate'>{aadharNo || "—"}</p>
														</div>

														{/* PAN */}
														<div className='space-y-1.5'>
															<p className='text-xs text-muted-foreground'>PAN</p>
															{panUrl ? (
																<Button
																	variant='outline'
																	size='sm'
																	className='w-full'
																	asChild>
																	<a
																		href={panUrl}
																		target='_blank'
																		rel='noopener noreferrer'>
																		<ExternalLink className='mr-1.5 h-3.5 w-3.5' />
																		View
																	</a>
																</Button>
															) : (
																<p className='text-xs text-muted-foreground px-2 py-1.5 bg-muted/30 rounded text-center'>
																	No doc
																</p>
															)}
															<p className='text-xs font-mono truncate'>{panNo || "—"}</p>
														</div>
													</div>
												</div>

												{/* Bank Details Section */}
												<div className='space-y-1.5 pt-2 border-t border-border/50'>
													<p className='text-[10px] uppercase tracking-wide text-muted-foreground font-medium'>Bank Details</p>
													<div className='space-y-1 text-xs'>
														<div className='flex justify-between'>
															<span className='text-muted-foreground'>Bank:</span>
															<span className='font-medium truncate ml-2'>{emp.bank_name || "—"}</span>
														</div>
														<div className='flex justify-between'>
															<span className='text-muted-foreground'>A/C:</span>
															<span className='font-mono text-xs truncate ml-2'>{emp.bank_account_number || "—"}</span>
														</div>
														<div className='flex justify-between'>
															<span className='text-muted-foreground'>IFSC:</span>
															<span className='font-mono text-xs truncate ml-2'>{emp.bank_ifsc || "—"}</span>
														</div>
														{emp.bank_location && (
															<div className='flex justify-between'>
																<span className='text-muted-foreground'>Location:</span>
																<span className='text-xs truncate ml-2'>{emp.bank_location}</span>
															</div>
														)}
													</div>
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
