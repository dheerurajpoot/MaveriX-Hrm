"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
	Plus,
	Calendar,
	Pencil,
	Upload,
	ExternalLink,
	Loader2,
} from "lucide-react";
import { useUser } from "../../../contexts/user-context";
import { toast } from "react-hot-toast";
import type { LeaveRequest, LeaveType, LeaveBalance } from "@/lib/types";

const BUCKET = "employee-documents";

interface LeaveRequestWithType extends LeaveRequest {
	leave_type?: LeaveType;
}

interface LeaveBalanceWithType extends LeaveBalance {
	leave_type?: LeaveType;
}

function calcDays(
	start: string,
	end: string,
	halfDay?: boolean | null
): number {
	if (halfDay) return 1; // Half-day leave consumes 1 full day from leave balance
	const s = new Date(start);
	const e = new Date(end);
	return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function formatLeaveDays(
	start: string,
	end: string,
	halfDay?: boolean | null
): string {
	if (halfDay) return "half day";
	const days = calcDays(start, end, halfDay);
	return `${Math.round(days)} day${days !== 1 ? "s" : ""}`;
}

function isMedicalLeave(type?: LeaveType | null): boolean {
	const n = (type?.name ?? "").toLowerCase();
	return n.includes("sick") || n.includes("medical");
}

const emptyForm = () => ({
	leave_type_id: "",
	start_date: "",
	end_date: "",
	reason: "",
	half_day: false,
	half_day_period: "" as "" | "first_half" | "second_half",
	document_url: null as string | null,
});

export default function EmployeeLeavePage() {
	const { employee } = useUser();
	const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithType[]>(
		[]
	);
	const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
	const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceWithType[]>(
		[]
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingRequest, setEditingRequest] =
		useState<LeaveRequestWithType | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [docUploading, setDocUploading] = useState(false);
	const docInputRef = useRef<HTMLInputElement>(null);
	const currentYear = new Date().getFullYear();

	const [formData, setFormData] = useState(emptyForm());

	useEffect(() => {
		if (employee) fetchData();
	}, [employee]);

	const fetchData = async () => {
		if (!employee) return;
		const supabase = createClient();

		const { data: requestsData } = await supabase
			.from("leave_requests")
			.select("*, leave_type:leave_types(*)")
			.eq("employee_id", employee.id)
			.order("created_at", { ascending: false });

		const { data: typesData } = await supabase
			.from("leave_types")
			.select("*")
			.eq("is_active", true);

		const { data: balancesData } = await supabase
			.from("leave_balances")
			.select("*, leave_type:leave_types(*)")
			.eq("employee_id", employee.id)
			.eq("year", currentYear);

		setLeaveRequests(
			(requestsData as unknown as LeaveRequestWithType[]) || []
		);
		setLeaveTypes(typesData || []);
		setLeaveBalances(
			(balancesData as unknown as LeaveBalanceWithType[]) || []
		);
		setIsLoading(false);
	};

	// In the request dialog, only show leave types that are allotted to this employee
	// and have remaining balance (available to request). When editing a pending request,
	// include that request's leave type so the dropdown still shows the current selection.
	const requestableLeaveBalances = useMemo(() => {
		const withBalance = leaveBalances.filter((b) => {
			const rem = Number(b.total_days ?? 0) - Number(b.used_days ?? 0);
			return rem > 0 && b.leave_type != null;
		});
		if (editingRequest?.leave_type_id && editingRequest?.leave_type) {
			const alreadyIncluded = withBalance.some(
				(b) => b.leave_type_id === editingRequest.leave_type_id
			);
			if (!alreadyIncluded) {
				const balanceForEdit = leaveBalances.find(
					(b) => b.leave_type_id === editingRequest.leave_type_id
				);
				if (balanceForEdit) {
					return [balanceForEdit, ...withBalance];
				}
			}
		}
		return withBalance;
	}, [
		leaveBalances,
		editingRequest?.leave_type_id,
		editingRequest?.leave_type,
	]);

	const selectedType = leaveTypes.find(
		(t) => t.id === formData.leave_type_id
	);
	const selectedBalance = leaveBalances.find(
		(b) => b.leave_type_id === formData.leave_type_id
	);
	const remaining = selectedBalance
		? Number(selectedBalance.total_days ?? 0) -
		  Number(selectedBalance.used_days ?? 0)
		: 0;
	const requestDays =
		formData.start_date && formData.end_date
			? calcDays(
					formData.start_date,
					formData.end_date,
					formData.half_day
			  )
			: 0;
	const canSubmit =
		formData.leave_type_id &&
		formData.start_date &&
		formData.end_date &&
		requestDays > 0 &&
		requestDays <= remaining &&
		(!isMedicalLeave(selectedType) || !!formData.document_url);

	const openNewDialog = () => {
		setEditingRequest(null);
		setFormData(emptyForm());
		setIsDialogOpen(true);
	};

	const openEditDialog = (req: LeaveRequestWithType) => {
		if (req.status !== "pending") return;
		setEditingRequest(req);
		setFormData({
			leave_type_id: req.leave_type_id,
			start_date: req.start_date,
			end_date: req.end_date,
			reason: req.reason ?? "",
			half_day: !!req.half_day,
			half_day_period:
				(req.half_day_period as "first_half" | "second_half") || "",
			document_url: req.document_url ?? null,
		});
		setIsDialogOpen(true);
	};

	const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !employee) return;
		setDocUploading(true);
		const supabase = createClient();
		const ext = file.name.split(".").pop() || "pdf";
		const path = `${employee.id}/leave-${Date.now()}.${ext}`;
		const { error: upErr } = await supabase.storage
			.from(BUCKET)
			.upload(path, file, { upsert: true });
		if (upErr) {
			toast.error(upErr.message);
			setDocUploading(false);
			return;
		}
		const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
		setFormData((f) => ({ ...f, document_url: data.publicUrl }));
		setDocUploading(false);
		e.target.value = "";
	};

	const handleSubmit = async () => {
		if (!employee || !canSubmit) return;
		setSubmitting(true);
		const supabase = createClient();

		const payload = {
			employee_id: employee.id,
			leave_type_id: formData.leave_type_id,
			start_date: formData.start_date,
			end_date: formData.end_date,
			reason: formData.reason || null,
			half_day: formData.half_day || null,
			half_day_period:
				formData.half_day && formData.half_day_period
					? formData.half_day_period
					: null,
			document_url: formData.document_url || null,
		};

		if (editingRequest) {
			const { error } = await supabase
				.from("leave_requests")
				.update(payload)
				.eq("id", editingRequest.id)
				.eq("employee_id", employee.id)
				.eq("status", "pending");
			if (error) {
				toast.error(error.message);
			} else {
				toast.success("Leave request updated.");
				setIsDialogOpen(false);
				fetchData();
			}
		} else {
			const { error } = await supabase
				.from("leave_requests")
				.insert(payload);
			if (error) {
				toast.error(error.message);
			} else {
				toast.success("Leave request submitted.");
				setIsDialogOpen(false);
				setFormData(emptyForm());
				fetchData();
				// Notify admin & HR (fire-and-forget; does not block UI)
				const leaveTypeName =
					leaveTypes.find((t) => t.id === formData.leave_type_id)
						?.name ?? "Leave";
				fetch("/api/leave/notify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "new_request",
						employeeName:
							`${employee.first_name} ${employee.last_name}`.trim(),
						employeeEmail: employee.email,
						leaveTypeName,
						startDate: formData.start_date,
						endDate: formData.end_date,
						reason: formData.reason ?? "",
						halfDay: formData.half_day || null,
					}),
				}).catch(() => {});
			}
		}
		setSubmitting(false);
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

	const filteredRequests = useMemo(
		() =>
			leaveRequests.filter(
				(r) => new Date(r.start_date).getFullYear() === currentYear
			),
		[leaveRequests, currentYear]
	);

	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='Leave Requests'
				description='Manage your leave applications'
			/>

			<div className='flex-1 space-y-6 p-6'>
				<div className='grid gap-4 grid-cols-2 lg:grid-cols-5'>
					{leaveBalances.filter((b) => b.total_days > 0).length ===
					0 ? (
						<Card>
							<CardContent className='p-4 text-center text-muted-foreground text-sm'>
								No leave balance allotted for {currentYear}
							</CardContent>
						</Card>
					) : (
						leaveBalances
							.filter((b) => b.total_days > 0)
							.map((balance) => {
								const remaining =
									balance.total_days - balance.used_days;
								return (
									<Card key={balance.id}>
										<CardContent className='p-4 text-center'>
											<p className='text-sm text-muted-foreground'>
												{balance.leave_type?.name}
											</p>
											<p className='text-3xl font-bold text-primary mt-1'>
												{remaining % 1 === 0
													? remaining
													: remaining.toFixed(1)}
											</p>
											<p className='text-xs text-muted-foreground'>
												of{" "}
												{balance.total_days % 1 === 0
													? balance.total_days
													: balance.total_days.toFixed(
															1
													  )}{" "}
												days remaining
											</p>
										</CardContent>
									</Card>
								);
							})
					)}
				</div>

				<Card>
					<CardHeader>
						<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
							<CardTitle className='flex items-center gap-2'>
								<Calendar className='h-5 w-5' />
								My Leave Requests ({currentYear})
							</CardTitle>
							<Dialog
								open={isDialogOpen}
								onOpenChange={setIsDialogOpen}>
								<DialogTrigger asChild>
									<Button size='sm' onClick={openNewDialog}>
										<Plus className='mr-2 h-4 w-4' />
										New Request
									</Button>
								</DialogTrigger>
								<DialogContent className='max-h-[90vh] overflow-y-auto'>
									<DialogHeader>
										<DialogTitle>
											{editingRequest
												? "Edit Leave Request"
												: "Request Leave"}
										</DialogTitle>
										<DialogDescription>
											{editingRequest
												? "Update your pending leave request."
												: "Submit a new leave application for approval."}
										</DialogDescription>
									</DialogHeader>
									<div className='space-y-4 py-4'>
										<div className='space-y-2'>
											<Label>Leave Type</Label>
											<Select
												value={formData.leave_type_id}
												onValueChange={(v) =>
													setFormData({
														...formData,
														leave_type_id: v,
														document_url: null,
													})
												}
												disabled={!!editingRequest}>
												<SelectTrigger>
													<SelectValue placeholder='Select leave type' />
												</SelectTrigger>
												<SelectContent>
													{requestableLeaveBalances.length ===
													0 ? (
														<div className='py-2 px-2 text-sm text-muted-foreground'>
															No leave balance
															available. Contact
															HR for allotted
															leaves.
														</div>
													) : (
														requestableLeaveBalances.map(
															(balance) => (
																<SelectItem
																	key={
																		balance.leave_type_id
																	}
																	value={
																		balance.leave_type_id
																	}>
																	{balance
																		.leave_type
																		?.name ??
																		"—"}{" "}
																	(
																	{Number(
																		balance.total_days ??
																			0
																	) -
																		Number(
																			balance.used_days ??
																				0
																		)}{" "}
																	remaining)
																</SelectItem>
															)
														)
													)}
												</SelectContent>
											</Select>
										</div>

										{/* Half day: show when leave type selected */}
										{formData.leave_type_id && (
											<div className='space-y-2'>
												<div className='flex items-center gap-2'>
													<input
														type='checkbox'
														id='half_day'
														checked={
															formData.half_day
														}
														onChange={(e) => {
															const checked =
																e.target
																	.checked;
															setFormData({
																...formData,
																half_day:
																	checked,
																half_day_period:
																	checked
																		? "first_half"
																		: "",
																end_date:
																	checked &&
																	formData.start_date
																		? formData.start_date
																		: formData.end_date,
															});
														}}
														className='rounded'
													/>
													<Label htmlFor='half_day'>
														Half day leave
													</Label>
												</div>
												{formData.half_day && (
													<div className='flex gap-4 pl-6'>
														<label className='flex items-center gap-2 text-sm'>
															<input
																type='radio'
																name='half_period'
																checked={
																	formData.half_day_period ===
																	"first_half"
																}
																onChange={() =>
																	setFormData(
																		{
																			...formData,
																			half_day_period:
																				"first_half",
																		}
																	)
																}
															/>
															First half (9am –
															1pm)
														</label>
														<label className='flex items-center gap-2 text-sm'>
															<input
																type='radio'
																name='half_period'
																checked={
																	formData.half_day_period ===
																	"second_half"
																}
																onChange={() =>
																	setFormData(
																		{
																			...formData,
																			half_day_period:
																				"second_half",
																		}
																	)
																}
															/>
															Second half (1pm –
															7pm)
														</label>
													</div>
												)}
											</div>
										)}

										<div className='grid grid-cols-2 gap-4'>
											<div className='space-y-2'>
												<Label>Start Date</Label>
												<Input
													type='date'
													value={formData.start_date}
													onChange={(e) =>
														setFormData({
															...formData,
															start_date:
																e.target.value,
														})
													}
												/>
											</div>
											<div className='space-y-2'>
												<Label>End Date</Label>
												<Input
													type='date'
													value={formData.end_date}
													onChange={(e) =>
														setFormData({
															...formData,
															end_date:
																e.target.value,
														})
													}
												/>
											</div>
										</div>

										{/* Total & remaining when dates selected */}
										{formData.start_date &&
											formData.end_date &&
											formData.leave_type_id && (
												<div className='rounded-md border bg-muted/40 p-3 text-sm'>
													<p>
														<strong>
															Total leave:
														</strong>{" "}
														{formatLeaveDays(
															formData.start_date,
															formData.end_date,
															formData.half_day
														)}
													</p>
													<p>
														<strong>
															Remaining:
														</strong>{" "}
														{remaining % 1 === 0
															? remaining
															: remaining.toFixed(
																	1
															  )}{" "}
														day
														{remaining !== 1
															? "s"
															: ""}
													</p>
													{requestDays >
														remaining && (
														<p className='text-destructive font-medium'>
															Insufficient
															balance. Reduce days
															or choose another
															leave type.
														</p>
													)}
												</div>
											)}

										{/* Medical: required document upload */}
										{isMedicalLeave(selectedType) && (
											<div className='space-y-2'>
												<Label>
													Document (receipt / medical
													certificate){" "}
													<span className='text-destructive'>
														*
													</span>
												</Label>
												<input
													ref={docInputRef}
													type='file'
													accept='.pdf,.jpg,.jpeg,.png'
													className='hidden'
													onChange={handleDocUpload}
												/>
												<div className='flex items-center gap-2'>
													<Button
														type='button'
														variant='outline'
														size='sm'
														onClick={() =>
															docInputRef.current?.click()
														}
														disabled={docUploading}>
														{docUploading ? (
															<Loader2 className='h-4 w-4 animate-spin' />
														) : (
															<Upload className='mr-2 h-4 w-4' />
														)}
														Upload
													</Button>
													{formData.document_url && (
														<>
															<a
																href={
																	formData.document_url
																}
																target='_blank'
																rel='noopener noreferrer'
																className='text-sm text-primary hover:underline flex items-center gap-1'>
																<ExternalLink className='h-3 w-3' />{" "}
																Document
																attached
															</a>
															<Button
																type='button'
																variant='ghost'
																size='sm'
																className='h-7 text-destructive'
																onClick={() =>
																	setFormData(
																		(
																			f
																		) => ({
																			...f,
																			document_url:
																				null,
																		})
																	)
																}>
																Remove
															</Button>
														</>
													)}
												</div>
											</div>
										)}

										<div className='space-y-2'>
											<Label>Reason</Label>
											<Textarea
												placeholder='Reason for leave...'
												value={formData.reason}
												onChange={(e) =>
													setFormData({
														...formData,
														reason: e.target.value,
													})
												}
											/>
										</div>

										<div className='flex justify-end gap-3 pt-4'>
											<Button
												variant='outline'
												onClick={() =>
													setIsDialogOpen(false)
												}>
												Cancel
											</Button>
											<Button
												onClick={handleSubmit}
												disabled={
													!canSubmit || submitting
												}>
												{submitting ? (
													<Loader2 className='h-4 w-4 animate-spin' />
												) : editingRequest ? (
													"Update"
												) : (
													"Submit Request"
												)}
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className='flex justify-center py-8'>
								<p className='text-muted-foreground'>
									Loading...
								</p>
							</div>
						) : filteredRequests.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-8'>
								<p className='text-muted-foreground'>
									{leaveRequests.length === 0
										? "No leave requests found"
										: "No requests for this year"}
								</p>
							</div>
						) : (
							<div className='w-[300px] md:w-full overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Leave Type</TableHead>
											<TableHead>Duration</TableHead>
											<TableHead>Days</TableHead>
											<TableHead>Reason</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Submitted</TableHead>
											<TableHead className='w-[80px]'>
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredRequests.map((request) => (
											<TableRow key={request.id}>
												<TableCell>
													<Badge variant='outline'>
														{
															request.leave_type
																?.name
														}
													</Badge>
													{request.half_day &&
														request.half_day_period && (
															<span className='ml-2 text-xs text-muted-foreground'>
																(
																{request.half_day_period ===
																"first_half"
																	? "9am-1pm"
																	: "1pm-7pm"}
																)
															</span>
														)}
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
																href={
																	request.document_url
																}
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
													{getStatusBadge(
														request.status
													)}
												</TableCell>
												<TableCell className='text-sm text-muted-foreground'>
													{new Date(
														request.created_at
													).toLocaleDateString()}
												</TableCell>
												<TableCell>
													{request.status ===
														"pending" && (
														<Button
															variant='ghost'
															size='sm'
															className='h-8 w-8 p-0'
															onClick={() =>
																openEditDialog(
																	request
																)
															}
															title='Edit'>
															<Pencil className='h-4 w-4' />
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
