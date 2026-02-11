"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
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
	UserMinus,
	Search,
	Clock,
	CheckCircle2,
	XCircle,
	AlertCircle,
} from "lucide-react";
import type { Resignation, Employee } from "@/lib/types";
import { useUser } from "../../../contexts/user-context";

interface ResignationWithDetails extends Resignation {
	employee?: Employee;
	reviewer?: Employee;
}

export default function ResignationsPage() {
	const { employee: currentUser } = useUser();
	const [resignations, setResignations] = useState<ResignationWithDetails[]>(
		[]
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isLoading, setIsLoading] = useState(true);
	const [selectedResignation, setSelectedResignation] =
		useState<ResignationWithDetails | null>(null);
	const [reviewNotes, setReviewNotes] = useState("");

	const [stats, setStats] = useState({
		pending: 0,
		processing: 0,
		accepted: 0,
		rejected: 0,
	});

	useEffect(() => {
		fetchResignations();
	}, []);

	const fetchResignations = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("resignations")
			.select(
				"*, employee:employees!resignations_employee_id_fkey(*), reviewer:employees!resignations_reviewed_by_fkey(*)"
			)
			.order("created_at", { ascending: false });

		const resignationData =
			(data as unknown as ResignationWithDetails[]) || [];
		setResignations(resignationData);

		setStats({
			pending: resignationData.filter((r) => r.status === "pending")
				.length,
			processing: resignationData.filter((r) => r.status === "processing")
				.length,
			accepted: resignationData.filter((r) => r.status === "accepted")
				.length,
			rejected: resignationData.filter((r) => r.status === "rejected")
				.length,
		});

		setIsLoading(false);
	};

	const handleUpdateStatus = async (
		status: "processing" | "accepted" | "rejected"
	) => {
		if (!selectedResignation) return;

		const supabase = createClient();

		await supabase
			.from("resignations")
			.update({
				status,
				notes: reviewNotes || null,
				reviewed_by: currentUser?.id,
				reviewed_at: new Date().toISOString(),
			})
			.eq("id", selectedResignation.id);

		// If accepted, mark employee as inactive
		if (status === "accepted") {
			await supabase
				.from("employees")
				.update({ is_active: false })
				.eq("id", selectedResignation.employee_id);
		}

		await fetchResignations();
		setSelectedResignation(null);
		setReviewNotes("");
	};

	const filteredResignations = resignations.filter((resignation) => {
		const matchesSearch =
			resignation.employee?.first_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			resignation.employee?.last_name
				?.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesStatus =
			statusFilter === "all" || resignation.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "pending":
				return <Badge variant='secondary'>Pending</Badge>;
			case "processing":
				return (
					<Badge className='bg-warning text-warning-foreground'>
						Processing
					</Badge>
				);
			case "accepted":
				return (
					<Badge className='bg-success text-success-foreground'>
						Accepted
					</Badge>
				);
			case "rejected":
				return <Badge variant='destructive'>Rejected</Badge>;
			default:
				return <Badge variant='outline'>{status}</Badge>;
		}
	};

	const calculateNoticeDays = (createdAt: string, lastWorkingDay: string) => {
		const created = new Date(createdAt);
		const lastDay = new Date(lastWorkingDay);
		const diffTime = lastDay.getTime() - created.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	};

	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='Resignations'
				description='Manage employee resignations'
			/>

			<div className='flex-1 space-y-6 p-6'>
				{/* Stats */}
				<div className='grid gap-4 grid-cols-2 md:grid-cols-4'>
					<StatCard
						title='Pending'
						value={stats.pending}
						icon={<Clock className='h-5 w-5' />}
						className='border-l-4 border-l-muted-foreground'
					/>
					<StatCard
						title='Processing'
						value={stats.processing}
						icon={<AlertCircle className='h-5 w-5' />}
						className='border-l-4 border-l-warning'
					/>
					<StatCard
						title='Accepted'
						value={stats.accepted}
						icon={<CheckCircle2 className='h-5 w-5' />}
						className='border-l-4 border-l-success'
					/>
					<StatCard
						title='Rejected'
						value={stats.rejected}
						icon={<XCircle className='h-5 w-5' />}
						className='border-l-4 border-l-destructive'
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
							value={statusFilter}
							onValueChange={setStatusFilter}>
							<SelectTrigger className='w-[150px]'>
								<SelectValue placeholder='Filter status' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>All Status</SelectItem>
								<SelectItem value='pending'>Pending</SelectItem>
								<SelectItem value='processing'>
									Processing
								</SelectItem>
								<SelectItem value='accepted'>
									Accepted
								</SelectItem>
								<SelectItem value='rejected'>
									Rejected
								</SelectItem>
							</SelectContent>
						</Select>
					</CardContent>
				</Card>

				{/* Resignations Table */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<UserMinus className='h-5 w-5' />
							Resignation Requests
						</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className='flex items-center justify-center py-8'>
								<p className='text-muted-foreground'>
									Loading...
								</p>
							</div>
						) : filteredResignations.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-8'>
								<p className='text-muted-foreground'>
									No resignation requests found
								</p>
							</div>
						) : (
							<div className='w-[300px] md:w-full overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Employee</TableHead>
											<TableHead>Submitted</TableHead>
											<TableHead>
												Last Working Day
											</TableHead>
											<TableHead>Notice Period</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredResignations.map(
											(resignation) => (
												<TableRow key={resignation.id}>
													<TableCell>
														<div className='flex items-center gap-3'>
															<Avatar className='h-9 w-9'>
																{resignation.employee?.avatar_url && (
																	<AvatarImage height={32} width={32} className="object-cover"
																		src={resignation.employee.avatar_url}
																		alt="Profile Pic"
																	/>
																)}
																<AvatarFallback className='text-xs'>
																	{
																		resignation
																			.employee
																			?.first_name?.[0]
																	}
																	{
																		resignation
																			.employee
																			?.last_name?.[0]
																	}
																</AvatarFallback>
															</Avatar>
															<div>
																<p className='font-medium'>
																	{
																		resignation
																			.employee
																			?.first_name
																	}{" "}
																	{
																		resignation
																			.employee
																			?.last_name
																	}
																</p>
																<p className='text-sm text-muted-foreground'>
																	{
																		resignation
																			.employee
																			?.designation
																	}
																</p>
															</div>
														</div>
													</TableCell>
													<TableCell className='text-sm'>
														{new Date(
															resignation.created_at
														).toLocaleDateString()}
													</TableCell>
													<TableCell className='text-sm'>
														{new Date(
															resignation.last_working_day
														).toLocaleDateString()}
													</TableCell>
													<TableCell>
														<Badge variant='outline'>
															{calculateNoticeDays(
																resignation.created_at,
																resignation.last_working_day
															)}{" "}
															days
														</Badge>
													</TableCell>
													<TableCell>
														{getStatusBadge(
															resignation.status
														)}
													</TableCell>
													<TableCell>
														<Button
															size='sm'
															variant='outline'
															onClick={() =>
																setSelectedResignation(
																	resignation
																)
															}>
															Review
														</Button>
													</TableCell>
												</TableRow>
											)
										)}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Review Dialog */}
				<Dialog
					open={!!selectedResignation}
					onOpenChange={(open) =>
						!open && setSelectedResignation(null)
					}>
					<DialogContent className='max-w-lg'>
						<DialogHeader>
							<DialogTitle>Review Resignation</DialogTitle>
							<DialogDescription>
								Review and process this resignation request
							</DialogDescription>
						</DialogHeader>
						{selectedResignation && (
							<div className='space-y-4 py-4'>
								<div className='flex items-center gap-4'>
									<Avatar className='h-12 w-12'>
										{selectedResignation.employee?.avatar_url && (
											<AvatarImage height={32} width={32} className="object-cover"
												src={selectedResignation.employee.avatar_url}
												alt="Profile Pic"
											/>
										)}
										<AvatarFallback>
											{
												selectedResignation.employee
													?.first_name?.[0]
											}
											{
												selectedResignation.employee
													?.last_name?.[0]
											}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className='font-medium'>
											{
												selectedResignation.employee
													?.first_name
											}{" "}
											{
												selectedResignation.employee
													?.last_name
											}
										</p>
										<p className='text-sm text-muted-foreground'>
											{
												selectedResignation.employee
													?.designation
											}{" "}
											-{" "}
											{
												selectedResignation.employee
													?.department
											}
										</p>
									</div>
								</div>

								<div className='rounded-lg bg-muted p-4 space-y-2'>
									<div className='flex justify-between text-sm'>
										<span className='text-muted-foreground'>
											Submitted:
										</span>
										<span>
											{new Date(
												selectedResignation.created_at
											).toLocaleDateString()}
										</span>
									</div>
									<div className='flex justify-between text-sm'>
										<span className='text-muted-foreground'>
											Last Working Day:
										</span>
										<span>
											{new Date(
												selectedResignation.last_working_day
											).toLocaleDateString()}
										</span>
									</div>
									<div className='flex justify-between text-sm'>
										<span className='text-muted-foreground'>
											Notice Period:
										</span>
										<span>
											{calculateNoticeDays(
												selectedResignation.created_at,
												selectedResignation.last_working_day
											)}{" "}
											days
										</span>
									</div>
								</div>

								<div className='space-y-2'>
									<Label>Reason for Resignation</Label>
									<div className='rounded-lg border border-border p-3 text-sm'>
										{selectedResignation.reason}
									</div>
								</div>

								{selectedResignation.status === "pending" ||
								selectedResignation.status === "processing" ? (
									<>
										<div className='space-y-2'>
											<Label>
												Review Notes (Optional)
											</Label>
											<Textarea
												placeholder='Add notes for the employee...'
												value={reviewNotes}
												onChange={(e) =>
													setReviewNotes(
														e.target.value
													)
												}
											/>
										</div>

										<div className='flex gap-3 pt-4'>
											{selectedResignation.status ===
												"pending" && (
												<Button
													variant='outline'
													className='flex-1 bg-transparent'
													onClick={() =>
														handleUpdateStatus(
															"processing"
														)
													}>
													Start Processing
												</Button>
											)}
											<Button
												variant='outline'
												className='flex-1 bg-transparent'
												onClick={() =>
													handleUpdateStatus(
														"rejected"
													)
												}>
												<XCircle className='mr-2 h-4 w-4' />
												Reject
											</Button>
											<Button
												className='flex-1'
												onClick={() =>
													handleUpdateStatus(
														"accepted"
													)
												}>
												<CheckCircle2 className='mr-2 h-4 w-4' />
												Accept
											</Button>
										</div>
									</>
								) : (
									<div className='rounded-lg bg-muted p-4'>
										<p className='text-sm text-muted-foreground'>
											This resignation has been{" "}
											{selectedResignation.status}
											{selectedResignation.reviewer && (
												<>
													{" "}
													by{" "}
													{
														selectedResignation
															.reviewer.first_name
													}{" "}
													{
														selectedResignation
															.reviewer.last_name
													}
												</>
											)}
											{selectedResignation.reviewed_at && (
												<>
													{" "}
													on{" "}
													{new Date(
														selectedResignation.reviewed_at
													).toLocaleDateString()}
												</>
											)}
										</p>
										{selectedResignation.notes && (
											<p className='mt-2 text-sm'>
												Notes:{" "}
												{selectedResignation.notes}
											</p>
										)}
									</div>
								)}
							</div>
						)}
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
