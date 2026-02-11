"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardHeader } from "@/components/dashboard/header";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
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
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Pencil, Trash2, UserPlus, Search } from "lucide-react";
import type { Team, Employee, TeamMember } from "@/lib/types";

interface TeamWithDetails extends Team {
	leader?: Employee;
	team_members?: Array<TeamMember & { employee: Employee }>;
}

export default function TeamsPage() {
	const [teams, setTeams] = useState<TeamWithDetails[]>([]);
	const [employees, setEmployees] = useState<Employee[]>([]);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [editingTeam, setEditingTeam] = useState<TeamWithDetails | null>(
		null
	);
	const [addMemberTeam, setAddMemberTeam] = useState<TeamWithDetails | null>(
		null
	);
	const [selectedEmployee, setSelectedEmployee] = useState<string>("");
	const [memberSearch, setMemberSearch] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	const [formData, setFormData] = useState({
		name: "",
		description: "",
		leader_id: "",
	});

	useEffect(() => {
		fetchTeams();
		fetchEmployees();
	}, []);

	const fetchTeams = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("teams")
			.select(
				`
        *,
        leader:employees!teams_leader_id_fkey(*),
        team_members(*, employee:employees(*))
      `
			)
			.order("created_at", { ascending: false });

		setTeams((data as unknown as TeamWithDetails[]) || []);
		setIsLoading(false);
	};

	const fetchEmployees = async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("employees")
			.select("*")
			.order("first_name");
		setEmployees(data || []);
	};

	const handleCreateTeam = async () => {
		const supabase = createClient();
		const { error } = await supabase.from("teams").insert({
			name: formData.name,
			description: formData.description,
			leader_id: formData.leader_id || null,
		});

		if (!error) {
			await fetchTeams();
			setIsAddDialogOpen(false);
			resetForm();
		}
	};

	const handleUpdateTeam = async () => {
		if (!editingTeam) return;

		const supabase = createClient();
		const { error } = await supabase
			.from("teams")
			.update({
				name: formData.name,
				description: formData.description,
				leader_id: formData.leader_id || null,
			})
			.eq("id", editingTeam.id);

		if (!error) {
			await fetchTeams();
			setEditingTeam(null);
			resetForm();
		}
	};

	const handleDeleteTeam = async (id: string) => {
		const supabase = createClient();
		await supabase.from("teams").delete().eq("id", id);
		await fetchTeams();
	};

	const handleAddMember = async () => {
		if (!addMemberTeam || !selectedEmployee) return;

		const supabase = createClient();
		const { error } = await supabase.from("team_members").insert({
			team_id: addMemberTeam.id,
			employee_id: selectedEmployee,
		});

		if (!error) {
			await fetchTeams();
			setAddMemberTeam(null);
			setSelectedEmployee("");
			setMemberSearch("");
		}
	};

	const handleRemoveMember = async (memberId: string) => {
		const supabase = createClient();
		await supabase.from("team_members").delete().eq("id", memberId);
		await fetchTeams();
	};

	const resetForm = () => {
		setFormData({ name: "", description: "", leader_id: "" });
	};

	const openEditDialog = (team: TeamWithDetails) => {
		setEditingTeam(team);
		setFormData({
			name: team.name,
			description: team.description || "",
			leader_id: team.leader_id || "",
		});
	};

	// Employees who are not in any team as member or leader (one user = one team only)
	const getEmployeesNotInAnyTeam = () => {
		const memberIds = new Set(
			teams.flatMap(
				(t) => t.team_members?.map((m) => m.employee_id) ?? []
			)
		);
		const leaderIds = new Set(
			teams.map((t) => t.leader_id).filter(Boolean) as string[]
		);
		const inAnyTeam = new Set([...memberIds, ...leaderIds]);
		return employees.filter((e) => !inAnyTeam.has(e.id));
	};

	const getAvailableEmployeesForTeam = (team: TeamWithDetails) => {
		const notInAnyTeam = getEmployeesNotInAnyTeam();
		const alreadyInThisTeam = new Set(
			team.team_members?.map((m) => m.employee_id) ?? []
		);
		return notInAnyTeam.filter((e) => !alreadyInThisTeam.has(e.id));
	};

	const getFilteredAvailableForAddMember = () => {
		if (!addMemberTeam) return [];
		const list = getAvailableEmployeesForTeam(addMemberTeam);
		const q = memberSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(e) =>
				e.first_name?.toLowerCase().includes(q) ||
				e.last_name?.toLowerCase().includes(q) ||
				e.email?.toLowerCase().includes(q)
		);
	};

	return (
		<div className='flex flex-col'>
			<DashboardHeader title='Teams' description='Manage all teams' />

			<div className='flex-1 space-y-6 p-6'>
				{/* Header Actions */}
				<div className='flex justify-end'>
					<Dialog
						open={isAddDialogOpen}
						onOpenChange={setIsAddDialogOpen}>
						<DialogTrigger asChild>
							<Button>
								<Plus className='mr-2 h-4 w-4' />
								Create Team
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create New Team</DialogTitle>
								<DialogDescription>
									Create a new team and assign a team leader
								</DialogDescription>
							</DialogHeader>
							<div className='space-y-4 py-4'>
								<div className='space-y-2'>
									<Label htmlFor='name'>Team Name</Label>
									<Input
										id='name'
										value={formData.name}
										onChange={(e) =>
											setFormData({
												...formData,
												name: e.target.value,
											})
										}
										placeholder='e.g., Engineering'
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='description'>
										Description
									</Label>
									<Textarea
										id='description'
										value={formData.description}
										onChange={(e) =>
											setFormData({
												...formData,
												description: e.target.value,
											})
										}
										placeholder='Team description...'
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='leader'>Team Leader</Label>
									<Select
										value={formData.leader_id}
										onValueChange={(value) =>
											setFormData({
												...formData,
												leader_id: value,
											})
										}>
										<SelectTrigger>
											<SelectValue placeholder='Select a leader' />
										</SelectTrigger>
										<SelectContent>
											{employees.map((emp) => (
												<SelectItem
													key={emp.id}
													value={emp.id}>
													{emp.first_name}{" "}
													{emp.last_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className='flex justify-end gap-3 pt-4'>
									<Button
										variant='outline'
										onClick={() =>
											setIsAddDialogOpen(false)
										}>
										Cancel
									</Button>
									<Button
										onClick={handleCreateTeam}
										disabled={!formData.name}>
										Create Team
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				</div>

				{/* Teams Grid */}
				{isLoading ? (
					<div className='flex items-center justify-center py-12'>
						<p className='text-muted-foreground'>
							Loading teams...
						</p>
					</div>
				) : teams.length === 0 ? (
					<Card>
						<CardContent className='flex flex-col items-center justify-center py-12'>
							<Users className='h-12 w-12 text-muted-foreground mb-4' />
							<h3 className='text-lg font-medium'>
								No teams yet
							</h3>
							<p className='text-sm text-muted-foreground'>
								Create your first team to get started
							</p>
						</CardContent>
					</Card>
				) : (
					<div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
						{teams.map((team) => (
							<Card key={team.id} className='flex flex-col'>
								<CardHeader className='pb-3'>
									<div className='flex items-start justify-between'>
										<div>
											<CardTitle className='text-lg'>
												{team.name}
											</CardTitle>
											{team.description && (
												<CardDescription className='mt-1'>
													{team.description}
												</CardDescription>
											)}
										</div>
										<div className='flex gap-1'>
											<Button
												variant='ghost'
												size='icon'
												className='h-8 w-8'
												onClick={() =>
													openEditDialog(team)
												}>
												<Pencil className='h-4 w-4' />
											</Button>
											<Button
												variant='ghost'
												size='icon'
												className='h-8 w-8 text-destructive'
												onClick={() =>
													handleDeleteTeam(team.id)
												}>
												<Trash2 className='h-4 w-4' />
											</Button>
										</div>
									</div>
								</CardHeader>
								<CardContent className='flex-1 space-y-4'>
									{/* Team Leader */}
									{team.leader && (
										<div className='flex items-center gap-3 rounded-lg bg-muted/50 p-3'>
											<Avatar className='h-10 w-10'>
												{team.leader.avatar_url && (
													<AvatarImage
														height={32}
														width={32}
														className='object-cover'
														src={team.leader.avatar_url}
														alt='Profile Pic'
													/>
												)}
												<AvatarFallback className='bg-primary text-primary-foreground'>
													{
														team.leader
															.first_name?.[0]
													}
													{team.leader.last_name?.[0]}
												</AvatarFallback>
											</Avatar>
											<div className='flex-1'>
												<p className='font-medium text-sm'>
													{team.leader.first_name}{" "}
													{team.leader.last_name}
												</p>
												<p className='text-xs text-muted-foreground'>
													Team Leader
												</p>
											</div>
										</div>
									)}

									{/* Team Members */}
									<div>
										<div className='flex items-center justify-between mb-2'>
											<p className='text-sm font-medium'>
												Members (
												{team.team_members?.length || 0}
												)
											</p>
											<Button
												variant='ghost'
												size='sm'
												className='h-7 text-xs'
												onClick={() =>
													setAddMemberTeam(team)
												}>
												<UserPlus className='mr-1 h-3 w-3' />
												Add
											</Button>
										</div>
										<div className='space-y-2'>
											{team.team_members &&
											team.team_members.length > 0 ? (
												team.team_members
													.slice(0, 4)
													.map((member) => (
														<div
															key={member.id}
															className='flex items-center justify-between rounded-lg border border-border p-2'>
															<div className='flex items-center gap-2'>
																<Avatar className='h-7 w-7'>
																	{member.employee?.avatar_url && (
																		<AvatarImage
																			height={32}
																			width={32}
																			className='object-cover'
																			src={member.employee.avatar_url}
																			alt='Profile Pic'
																		/>
																	)}
																	<AvatarFallback className='text-xs'>
																		{
																			member
																				.employee
																				?.first_name?.[0]
																		}
																		{
																			member
																				.employee
																				?.last_name?.[0]
																		}
																	</AvatarFallback>
																</Avatar>
																<span className='text-sm'>
																	{
																		member
																			.employee
																			?.first_name
																	}{" "}
																	{
																		member
																			.employee
																			?.last_name
																	}
																</span>
															</div>
															<Button
																variant='ghost'
																size='icon'
																className='h-6 w-6 text-muted-foreground hover:text-destructive'
																onClick={() =>
																	handleRemoveMember(
																		member.id
																	)
																}>
																<Trash2 className='h-3 w-3' />
															</Button>
														</div>
													))
											) : (
												<p className='text-xs text-muted-foreground py-2'>
													No members yet
												</p>
											)}
											{team.team_members &&
												team.team_members.length >
													4 && (
													<Badge
														variant='secondary'
														className='text-xs'>
														+
														{team.team_members
															.length - 4}{" "}
														more
													</Badge>
												)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{/* Edit Team Dialog */}
				<Dialog
					open={!!editingTeam}
					onOpenChange={(open) => !open && setEditingTeam(null)}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Edit Team</DialogTitle>
							<DialogDescription>
								Update team information
							</DialogDescription>
						</DialogHeader>
						<div className='space-y-4 py-4'>
							<div className='space-y-2'>
								<Label htmlFor='edit-name'>Team Name</Label>
								<Input
									id='edit-name'
									value={formData.name}
									onChange={(e) =>
										setFormData({
											...formData,
											name: e.target.value,
										})
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-description'>
									Description
								</Label>
								<Textarea
									id='edit-description'
									value={formData.description}
									onChange={(e) =>
										setFormData({
											...formData,
											description: e.target.value,
										})
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-leader'>Team Leader</Label>
								<Select
									value={formData.leader_id}
									onValueChange={(value) =>
										setFormData({
											...formData,
											leader_id: value,
										})
									}>
									<SelectTrigger>
										<SelectValue placeholder='Select a leader' />
									</SelectTrigger>
									<SelectContent>
										{employees.map((emp) => (
											<SelectItem
												key={emp.id}
												value={emp.id}>
												{emp.first_name} {emp.last_name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='flex justify-end gap-3 pt-4'>
								<Button
									variant='outline'
									onClick={() => setEditingTeam(null)}>
									Cancel
								</Button>
								<Button onClick={handleUpdateTeam}>
									Save Changes
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				{/* Add Member Dialog */}
				<Dialog
					open={!!addMemberTeam}
					onOpenChange={(open) => {
						if (!open) {
							setAddMemberTeam(null);
							setSelectedEmployee("");
							setMemberSearch("");
						}
					}}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add Team Member</DialogTitle>
							<DialogDescription>
								Add a member to {addMemberTeam?.name}. Each
								employee can be in only one team.
							</DialogDescription>
						</DialogHeader>
						<div className='space-y-4 py-4'>
							<div className='space-y-2'>
								<Label>Search and select employee</Label>
								<div className='relative'>
									<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
									<Input
										placeholder='Search by name or email...'
										value={memberSearch}
										onChange={(e) =>
											setMemberSearch(e.target.value)
										}
										className='pl-9'
									/>
								</div>
								<div className='border rounded-md max-h-[220px] overflow-y-auto'>
									{getFilteredAvailableForAddMember()
										.length === 0 ? (
										<p className='p-4 text-sm text-muted-foreground text-center'>
											{memberSearch.trim()
												? "No matching employees (or all are already in a team)"
												: "No employees available (everyone is already in a team)"}
										</p>
									) : (
										<ul className='p-1'>
											{getFilteredAvailableForAddMember().map(
												(emp) => (
													<li key={emp.id}>
														<button
															type='button'
															onClick={() =>
																setSelectedEmployee(
																	emp.id
																)
															}
															className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
																selectedEmployee ===
																emp.id
																	? "bg-accent"
																	: ""
															}`}>
															<Avatar className='h-8 w-8'>
																{emp.avatar_url && (
																	<AvatarImage
																		height={32}
																		width={32}
																		className='object-cover'
																		src={emp.avatar_url}
																		alt='Profile Pic'
																	/>
																)}
																<AvatarFallback className='text-xs'>
																	{
																		emp
																			.first_name?.[0]
																	}
																	{
																		emp
																			.last_name?.[0]
																	}
																</AvatarFallback>
															</Avatar>
															<div className='flex-1 min-w-0'>
																<span className='font-medium'>
																	{
																		emp.first_name
																	}{" "}
																	{
																		emp.last_name
																	}
																</span>
																{emp.email && (
																	<span className='block text-xs text-muted-foreground truncate'>
																		{
																			emp.email
																		}
																	</span>
																)}
															</div>
														</button>
													</li>
												)
											)}
										</ul>
									)}
								</div>
								{selectedEmployee && (
									<p className='text-xs text-muted-foreground'>
										Selected:{" "}
										{
											employees.find(
												(e) => e.id === selectedEmployee
											)?.first_name
										}{" "}
										{
											employees.find(
												(e) => e.id === selectedEmployee
											)?.last_name
										}
									</p>
								)}
							</div>
							<div className='flex justify-end gap-3 pt-2'>
								<Button
									variant='outline'
									onClick={() => {
										setAddMemberTeam(null);
										setSelectedEmployee("");
										setMemberSearch("");
									}}>
									Cancel
								</Button>
								<Button
									onClick={handleAddMember}
									disabled={!selectedEmployee}>
									Add Member
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
