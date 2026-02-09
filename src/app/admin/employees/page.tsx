"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Plus,
	Search,
	MoreHorizontal,
	Pencil,
	Trash2,
	Mail,
	Phone,
	Loader2,
} from "lucide-react";
import type { Employee, UserRole } from "@/lib/types";
import { createEmployeeWithAuth } from "./actions";

export default function EmployeesPage() {
	const { employee: currentUser } = useUser();
	const searchParams = useSearchParams();
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
	const [searchQuery, setSearchQuery] = useState(
		() => searchParams.get("q") || ""
	);
	const [roleFilter, setRoleFilter] = useState<string>("all");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState<Employee | null>(
		null
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isAddLoading, setIsAddLoading] = useState(false);

	// Only admin and HR can add employees
	const canAddEmployee =
		currentUser?.role === "admin" || currentUser?.role === "hr";

	// Form state
	const [formData, setFormData] = useState<{
		first_name: string;
		last_name: string;
		email: string;
		phone: string;
		designation: string;
		department: string;
		address: string;
		role: UserRole;
		week_off_day: string;
	}>({
		first_name: "",
		last_name: "",
		email: "",
		phone: "",
		designation: "",
		department: "",
		address: "",
		role: "employee",
		week_off_day: "",
	});

	useEffect(() => {
		fetchEmployees();
	}, []);

	useEffect(() => {
		const q = searchParams.get("q");
		if (q) setSearchQuery(q);
	}, [searchParams]);

	useEffect(() => {
		let filtered = employees;

		if (searchQuery) {
			filtered = filtered.filter(
				(emp) =>
					emp.first_name
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					emp.last_name
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					emp.email.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		if (roleFilter !== "all") {
			filtered = filtered.filter((emp) => emp.role === roleFilter);
		}

		// Exclude admin users (in case fetch didn't filter)
		// filtered = filtered.filter((emp) => emp.role !== "admin");
		setFilteredEmployees(filtered);
	}, [employees, searchQuery, roleFilter]);

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("*")
			.order("created_at", { ascending: false });

		setEmployees(data || []);
		setIsLoading(false);
	};

	const handleUpdateEmployee = async () => {
		if (!editingEmployee) return;

		// HR cannot change role (role field hidden for HR); only admin can change role
		const isHr = currentUser?.role === "hr";

		const updatePayload: Record<string, unknown> = {
			first_name: formData.first_name,
			last_name: formData.last_name,
			phone: formData.phone,
			designation: formData.designation,
			department: formData.department,
			address: formData.address || null,
			week_off_day:
				formData.week_off_day === "" || formData.week_off_day === "none"
					? null
					: parseInt(formData.week_off_day, 10),
		};
		// Only admin can change role; HR cannot change any role
		if (!isHr) {
			updatePayload.role = formData.role;
		}

		const supabase = createClient();
		const { error } = await supabase
			.from("employees")
			.update(updatePayload)
			.eq("id", editingEmployee.id);

		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Employee updated successfully");
		await fetchEmployees();
		setEditingEmployee(null);
		resetForm();
	};

	const handleDeleteEmployee = async (employee: Employee) => {
		// Admin users are not shown; HR cannot delete HR users
		if (
			currentUser?.role === "hr" &&
			(employee.role === "hr" || employee.role === "admin")
		) {
			toast.error("HR cannot delete HR or Admin users.");
			return;
		}
		const supabase = createClient();
		const { error } = await supabase
			.from("employees")
			.delete()
			.eq("id", employee.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Employee deleted successfully");
		await fetchEmployees();
	};

	const resetForm = () => {
		setFormData({
			first_name: "",
			last_name: "",
			email: "",
			phone: "",
			designation: "",
			department: "",
			address: "",
			role: "employee",
			week_off_day: "",
		});
	};

	const resetAddForm = () => {
		resetForm();
	};

	const handleAddEmployee = async (e: React.FormEvent) => {
		e.preventDefault();
		const roleToUse =
			currentUser?.role === "hr" ? "employee" : formData.role;
		const weekOff =
			formData.week_off_day === "" || formData.week_off_day === "none"
				? null
				: parseInt(formData.week_off_day, 10);
		setIsAddLoading(true);
		const result = await createEmployeeWithAuth({
			first_name: formData.first_name,
			last_name: formData.last_name,
			email: formData.email.trim(),
			designation: formData.designation || undefined,
			role: roleToUse,
			week_off_day: weekOff,
		});
		setIsAddLoading(false);
		if (result.ok) {
			toast.success(
				"Employee invited successfully. They will receive an email to set their password."
			);
			await fetchEmployees();
			setIsAddDialogOpen(false);
			resetAddForm();
		} else {
			toast.error(result.error);
		}
	};

	const openEditDialog = (employee: Employee) => {
		setEditingEmployee(employee);
		setFormData({
			first_name: employee.first_name,
			last_name: employee.last_name,
			email: employee.email,
			phone: employee.phone || "",
			designation: employee.designation || "",
			department: employee.department || "",
			address: employee.address || "",
			role: employee.role,
			week_off_day:
				employee.week_off_day != null
					? String(employee.week_off_day)
					: "none",
		});
	};

	const getRoleBadgeVariant = (role: string) => {
		switch (role) {
			case "admin":
				return "default";
			case "hr":
				return "secondary";
			default:
				return "outline";
		}
	};

	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='Employees'
				description='Manage all employees'
			/>

			<div className='flex-1 space-y-6 p-6'>
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
							value={roleFilter}
							onValueChange={setRoleFilter}>
							<SelectTrigger className='w-[150px]'>
								<SelectValue placeholder='Filter by role' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>All Roles</SelectItem>
								<SelectItem value='hr'>HR</SelectItem>
								<SelectItem value='employee'>
									Employee
								</SelectItem>
							</SelectContent>
						</Select>
						{canAddEmployee && (
							<Dialog
								open={isAddDialogOpen}
								onOpenChange={(open) => {
									setIsAddDialogOpen(open);
									if (open) resetAddForm();
								}}>
								<DialogTrigger asChild>
									<Button>
										<Plus className='mr-2 h-4 w-4' />
										Add Employee
									</Button>
								</DialogTrigger>
								<DialogContent className='max-w-md'>
									<DialogHeader>
										<DialogTitle>
											Add New Employee
										</DialogTitle>
										<DialogDescription>
											Invite by email. They will set phone
											and department in their profile
											after signing in.
										</DialogDescription>
									</DialogHeader>
									<form
										onSubmit={handleAddEmployee}
										className='space-y-4 py-4'>
										<div className='grid grid-cols-2 gap-4'>
											<div className='space-y-2'>
												<Label htmlFor='add-first-name'>
													First Name
												</Label>
												<Input
													id='add-first-name'
													required
													value={formData.first_name}
													onChange={(e) =>
														setFormData({
															...formData,
															first_name:
																e.target.value,
														})
													}
													placeholder='John'
												/>
											</div>
											<div className='space-y-2'>
												<Label htmlFor='add-last-name'>
													Last Name
												</Label>
												<Input
													id='add-last-name'
													required
													value={formData.last_name}
													onChange={(e) =>
														setFormData({
															...formData,
															last_name:
																e.target.value,
														})
													}
													placeholder='Doe'
												/>
											</div>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='add-email'>
												Email
											</Label>
											<Input
												id='add-email'
												type='email'
												required
												value={formData.email}
												onChange={(e) =>
													setFormData({
														...formData,
														email: e.target.value,
													})
												}
												placeholder='you@company.com'
											/>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='add-designation'>
												Designation
											</Label>
											<Input
												id='add-designation'
												value={formData.designation}
												onChange={(e) =>
													setFormData({
														...formData,
														designation:
															e.target.value,
													})
												}
												placeholder='Optional'
											/>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='add-week-off'>
												Week Off Day
											</Label>
											<Select
												value={
													formData.week_off_day ||
													"none"
												}
												onValueChange={(value) =>
													setFormData({
														...formData,
														week_off_day: value,
													})
												}>
												<SelectTrigger id='add-week-off'>
													<SelectValue placeholder='No fixed week off' />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='none'>
														None
													</SelectItem>
													<SelectItem value='0'>
														Sunday
													</SelectItem>
													<SelectItem value='1'>
														Monday
													</SelectItem>
													<SelectItem value='2'>
														Tuesday
													</SelectItem>
													<SelectItem value='3'>
														Wednesday
													</SelectItem>
													<SelectItem value='4'>
														Thursday
													</SelectItem>
													<SelectItem value='5'>
														Friday
													</SelectItem>
													<SelectItem value='6'>
														Saturday
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
										{currentUser?.role === "admin" && (
											<div className='space-y-2'>
												<Label htmlFor='add-role'>
													Role
												</Label>
												<Select
													value={formData.role}
													onValueChange={(value) =>
														setFormData({
															...formData,
															role: value as
																| "admin"
																| "hr"
																| "employee",
														})
													}>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value='employee'>
															Employee
														</SelectItem>
														<SelectItem value='hr'>
															HR
														</SelectItem>
														<SelectItem value='admin'>
															Admin
														</SelectItem>
													</SelectContent>
												</Select>
											</div>
										)}
										<div className='flex justify-end gap-3 pt-2'>
											<Button
												type='button'
												variant='outline'
												onClick={() =>
													setIsAddDialogOpen(false)
												}>
												Cancel
											</Button>
											<Button
												type='submit'
												disabled={isAddLoading}>
												{isAddLoading ? (
													<>
														<Loader2 className='mr-2 h-4 w-4 animate-spin' />
														Creating...
													</>
												) : (
													"Create Employee"
												)}
											</Button>
										</div>
									</form>
								</DialogContent>
							</Dialog>
						)}
					</CardContent>
				</Card>

				{/* Employees Table */}
				<Card>
					<CardHeader>
						<CardTitle>
							All Employees ({filteredEmployees.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className='flex items-center justify-center py-8'>
								<p className='text-muted-foreground'>
									Loading employees...
								</p>
							</div>
						) : filteredEmployees.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-8'>
								<p className='text-muted-foreground'>
									No employees found
								</p>
							</div>
						) : (
							<div className='w-[300px] md:w-full overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Employee</TableHead>
											<TableHead>Employee ID</TableHead>
											<TableHead>Contact</TableHead>
											<TableHead>Designation</TableHead>
											<TableHead>Week Off</TableHead>
											<TableHead>Role</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className='w-[70px]'>
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredEmployees.map((employee) => (
											<TableRow key={employee.id}>
												<TableCell>
													<div className='flex items-center gap-3'>
														<Avatar className='h-9 w-9'>
															<AvatarFallback className='bg-primary/10 text-primary text-sm'>
																{
																	employee
																		.first_name?.[0]
																}
																{
																	employee
																		.last_name?.[0]
																}
															</AvatarFallback>
														</Avatar>
														<div>
															<p className='font-medium'>
																{
																	employee.first_name
																}{" "}
																{
																	employee.last_name
																}
															</p>
															{/* <p className='text-sm text-muted-foreground'>
																{employee.designation ||
																	"No designation"}
															</p> */}
														</div>
													</div>
												</TableCell>
												<TableCell className='text-sm tabular-nums'>
													{employee.employee_id ||
														"—"}
												</TableCell>
												<TableCell>
													<div className='space-y-1'>
														<p className='flex items-center gap-1 text-sm'>
															<Mail className='h-3 w-3' />
															{employee.email}
														</p>
														{employee.phone && (
															<p className='flex items-center gap-1 text-sm text-muted-foreground'>
																<Phone className='h-3 w-3' />
																{employee.phone}
															</p>
														)}
													</div>
												</TableCell>
												<TableCell>
													{employee.designation ||
														"-"}
												</TableCell>
												<TableCell className='text-sm'>
													{employee.week_off_day !=
														null
														? [
															"Sun",
															"Mon",
															"Tue",
															"Wed",
															"Thu",
															"Fri",
															"Sat",
														][
														employee
															.week_off_day
														] ?? "—"
														: "—"}
												</TableCell>
												<TableCell>
													<Badge
														variant={getRoleBadgeVariant(
															employee.role
														)}
														className='capitalize'>
														{employee.role}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge
														variant={
															employee.is_active
																? "default"
																: "secondary"
														}
														className={
															employee.is_active
																? "bg-success text-success-foreground"
																: ""
														}>
														{employee.is_active
															? "Active"
															: "Inactive"}
													</Badge>
												</TableCell>
												<TableCell>
													<DropdownMenu>
														<DropdownMenuTrigger
															asChild>
															<Button
																variant='ghost'
																size='icon'
																className='h-8 w-8'>
																<MoreHorizontal className='h-4 w-4' />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align='end'>
															<DropdownMenuItem
																onClick={() =>
																	openEditDialog(
																		employee
																	)
																}>
																<Pencil className='mr-2 h-4 w-4' />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																className='text-destructive'
																onClick={() =>
																	handleDeleteEmployee(
																		employee
																	)
																}>
																<Trash2 className='mr-2 h-4 w-4' />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Edit Dialog */}
				<Dialog
					open={!!editingEmployee}
					onOpenChange={(open) => !open && setEditingEmployee(null)}>
					<DialogContent className='max-w-md'>
						<DialogHeader>
							<DialogTitle>Edit Employee</DialogTitle>
							<DialogDescription>
								Update employee information
							</DialogDescription>
						</DialogHeader>
						<div className='space-y-4 py-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='edit-first-name'>
										First Name
									</Label>
									<Input
										id='edit-first-name'
										value={formData.first_name}
										onChange={(e) =>
											setFormData({
												...formData,
												first_name: e.target.value,
											})
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='edit-last-name'>
										Last Name
									</Label>
									<Input
										id='edit-last-name'
										value={formData.last_name}
										onChange={(e) =>
											setFormData({
												...formData,
												last_name: e.target.value,
											})
										}
									/>
								</div>
							</div>
							{/* <div className='space-y-2'>
								<Label htmlFor='edit-phone'>Phone</Label>
								<Input
									id='edit-phone'
									value={formData.phone}
									onChange={(e) =>
										setFormData({
											...formData,
											phone: e.target.value,
										})
									}
								/>
							</div> */}
							<div className='space-y-2'>
								<Label htmlFor='edit-designation'>
									Designation
								</Label>
								<Input
									id='edit-designation'
									value={formData.designation}
									onChange={(e) =>
										setFormData({
											...formData,
											designation: e.target.value,
										})
									}
								/>
							</div>
							{/* <div className='space-y-2'>
								<Label htmlFor='edit-department'>
									Department
								</Label>
								<Input
									id='edit-department'
									value={formData.department}
									onChange={(e) =>
										setFormData({
											...formData,
											department: e.target.value,
										})
									}
								/>
							</div> */}
							{/* <div className='space-y-2'>
								<Label htmlFor='edit-address'>Address</Label>
								<Input
									id='edit-address'
									value={formData.address}
									onChange={(e) =>
										setFormData({
											...formData,
											address: e.target.value,
										})
									}
									placeholder='Employee address (for salary slip)'
								/>
							</div> */}
							{currentUser?.role === "admin" && (
								<div className='space-y-2'>
									<Label htmlFor='edit-role'>Role</Label>
									<Select
										value={formData.role}
										onValueChange={(value) =>
											setFormData({
												...formData,
												role: value as UserRole,
											})
										}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='employee'>
												Employee
											</SelectItem>
											<SelectItem value='hr'>
												HR
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
							<div className='space-y-2'>
								<Label htmlFor='edit-week-off'>
									Week Off Day
								</Label>
								<Select
									value={formData.week_off_day || "none"}
									onValueChange={(value) =>
										setFormData({
											...formData,
											week_off_day: value,
										})
									}>
									<SelectTrigger>
										<SelectValue placeholder='No fixed week off' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='none'>
											None
										</SelectItem>
										<SelectItem value='0'>
											Sunday
										</SelectItem>
										<SelectItem value='1'>
											Monday
										</SelectItem>
										<SelectItem value='2'>
											Tuesday
										</SelectItem>
										<SelectItem value='3'>
											Wednesday
										</SelectItem>
										<SelectItem value='4'>
											Thursday
										</SelectItem>
										<SelectItem value='5'>
											Friday
										</SelectItem>
										<SelectItem value='6'>
											Saturday
										</SelectItem>
									</SelectContent>
								</Select>
								<p className='text-xs text-muted-foreground'>
									Day when this employee has weekly off (for
									attendance).
								</p>
							</div>
							<div className='flex justify-end gap-3 pt-4'>
								<Button
									variant='outline'
									onClick={() => setEditingEmployee(null)}>
									Cancel
								</Button>
								<Button onClick={handleUpdateEmployee}>
									Save Changes
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
