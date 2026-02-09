"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/app/employee/profile/actions";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/contexts/user-context";
import {
	User,
	Mail,
	Phone,
	Briefcase,
	Building2,
	Calendar,
	Save,
	Loader2,
	Camera,
	Trash2,
	Lock,
	IdCard,
	MapPin,
} from "lucide-react";

const AVATAR_BUCKET = "employee-documents";

export function ProfilePage() {
	const { employee, refreshUser } = useUser();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [avatarUploading, setAvatarUploading] = useState(false);
	const [avatarError, setAvatarError] = useState<string | null>(null);
	const avatarInputRef = useRef<HTMLInputElement>(null);
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [passwordSuccess, setPasswordSuccess] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [formData, setFormData] = useState({
		first_name: "",
		last_name: "",
		phone: "",
		address: "",
		date_of_birth: "",
		joining_date: "",
	});
	const [profileError, setProfileError] = useState<string | null>(null);

	useEffect(() => {
		if (employee) {
			setFormData({
				first_name: employee.first_name || "",
				last_name: employee.last_name || "",
				phone: employee.phone || "",
				address: employee.address || "",
				date_of_birth: employee.date_of_birth || "",
				joining_date: employee.joining_date
					? String(employee.joining_date).slice(0, 10)
					: "",
			});
		}
	}, [employee]);

	const handleAvatarUpload = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = e.target.files?.[0];
		if (!file || !employee?.id) return;
		const validTypes = [
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/gif",
		];
		if (!validTypes.includes(file.type)) {
			setAvatarError("Please choose a JPG, PNG, WebP or GIF image.");
			return;
		}
		setAvatarError(null);
		setAvatarUploading(true);
		const supabase = createClient();
		const ext = file.name.split(".").pop() || "jpg";
		const path = `${employee.id}/avatar.${ext}`;
		const { error: uploadErr } = await supabase.storage
			.from(AVATAR_BUCKET)
			.upload(path, file, { upsert: true });
		if (uploadErr) {
			setAvatarError(uploadErr.message);
			setAvatarUploading(false);
			return;
		}
		const { data: urlData } = supabase.storage
			.from(AVATAR_BUCKET)
			.getPublicUrl(path);
		const url = urlData?.publicUrl;
		if (!url) {
			setAvatarError("Could not get image URL");
			setAvatarUploading(false);
			return;
		}
		const { error: updateErr } = await supabase
			.from("employees")
			.update({ avatar_url: url })
			.eq("id", employee.id);
		if (updateErr) {
			setAvatarError(updateErr.message);
			setAvatarUploading(false);
			return;
		}
		await refreshUser();
		setAvatarUploading(false);
		e.target.value = "";
	};

	const handleRemoveAvatar = async () => {
		if (!employee?.id) return;
		setAvatarError(null);
		setAvatarUploading(true);
		const supabase = createClient();
		const { error } = await supabase
			.from("employees")
			.update({ avatar_url: null })
			.eq("id", employee.id);
		if (!error) await refreshUser();
		setAvatarUploading(false);
	};

	const handleSave = async () => {
		if (!employee) return;
		setIsSaving(true);
		setProfileError(null);

		const result = await updateProfile(employee.id, {
			first_name: formData.first_name,
			last_name: formData.last_name,
			phone: formData.phone || null,
			address: formData.address || null,
			date_of_birth: formData.date_of_birth || null,
			joining_date: formData.joining_date || null,
		});

		if (result.ok) {
			await refreshUser();
			setIsEditing(false);
		} else {
			setProfileError(result.error);
		}
		setIsSaving(false);
	};

	const handleChangePassword = async () => {
		const { currentPassword, newPassword, confirmPassword } = passwordForm;
		setPasswordError(null);
		setPasswordSuccess(false);
		if (!newPassword || newPassword.length < 6) {
			setPasswordError("New password must be at least 6 characters");
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordError("New passwords do not match");
			return;
		}
		setPasswordLoading(true);
		const supabase = createClient();
		try {
			// Re-authenticate with current password (optional but more secure)
			if (currentPassword) {
				const { error: signInError } =
					await supabase.auth.signInWithPassword({
						email: employee?.email ?? "",
						password: currentPassword,
					});
				if (signInError) {
					setPasswordError("Current password is incorrect");
					setPasswordLoading(false);
					return;
				}
			}
			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword,
			});
			if (updateError) throw updateError;
			setPasswordSuccess(true);
			setPasswordForm({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (err: unknown) {
			setPasswordError(
				err instanceof Error ? err.message : "Failed to update password"
			);
		} finally {
			setPasswordLoading(false);
		}
	};

	const initials = employee
		? `${employee.first_name?.[0] || ""}${
				employee.last_name?.[0] || ""
		  }`.toUpperCase()
		: "U";

	if (!employee) {
		return (
			<div className='flex items-center justify-center h-96'>
				<p className='text-muted-foreground'>Loading profile...</p>
			</div>
		);
	}

	return (
		<div className='flex flex-col'>
			<DashboardHeader
				title='My Profile'
				description='View and edit your profile'
			/>

			<div className='flex-1 space-y-6 p-6'>
				<div className='grid gap-6 lg:grid-cols-3'>
					{/* Profile Card */}
					<Card className='lg:col-span-1'>
						<CardContent className='pt-6'>
							<div className='flex flex-col items-center text-center'>
								<input
									ref={avatarInputRef}
									type='file'
									accept='image/jpeg,image/png,image/webp,image/gif'
									className='hidden'
									onChange={handleAvatarUpload}
								/>
								<div className='relative'>
									<Avatar className='h-24 w-24'>
										{employee.avatar_url ? (
											<AvatarImage
												className='object-cover'
												src={employee.avatar_url}
												alt={`${employee.first_name} ${employee.last_name}`}
											/>
										) : null}
										<AvatarFallback className='bg-primary text-primary-foreground text-2xl'>
											{initials}
										</AvatarFallback>
									</Avatar>
									<div className='mt-2 flex justify-center gap-2'>
										<Button
											variant='outline'
											size='sm'
											disabled={avatarUploading}
											onClick={() =>
												avatarInputRef.current?.click()
											}>
											{avatarUploading ? (
												<Loader2 className='h-4 w-4 animate-spin' />
											) : (
												<>
													<Camera className='mr-1 h-4 w-4' />
													{employee.avatar_url
														? "Change"
														: "Upload"}
												</>
											)}
										</Button>
										{employee.avatar_url && (
											<Button
												variant='outline'
												size='sm'
												disabled={avatarUploading}
												onClick={handleRemoveAvatar}
												className='text-destructive hover:text-destructive'>
												<Trash2 className='h-4 w-4' />
											</Button>
										)}
									</div>
								</div>
								{avatarError && (
									<p className='mt-2 text-xs text-destructive'>
										{avatarError}
									</p>
								)}
								<h3 className='mt-4 text-xl font-semibold'>
									{employee.first_name} {employee.last_name}
								</h3>
								<p className='text-sm text-muted-foreground'>
									{employee.designation || "—"}
								</p>
								<Badge className='mt-2 capitalize'>
									{employee.role === "employee"
										? employee.designation || "—"
										: employee.role}
								</Badge>
								{employee.employee_id && (
									<div className='mt-3 flex items-center justify-center gap-2 rounded-md bg-muted/60 px-3 py-2'>
										<IdCard className='h-4 w-4 text-muted-foreground' />
										<span className='text-sm font-medium tabular-nums'>
											{employee.employee_id}
										</span>
									</div>
								)}

								<Separator className='my-6' />

								<div className='w-full space-y-4 text-left'>
									<div className='flex items-center gap-3'>
										<Mail className='h-4 w-4 text-muted-foreground' />
										<span className='text-sm'>
											{employee.email}
										</span>
									</div>
									{employee.phone && (
										<div className='flex items-center gap-3'>
											<Phone className='h-4 w-4 text-muted-foreground' />
											<span className='text-sm'>
												{employee.phone}
											</span>
										</div>
									)}
									{employee.department && (
										<div className='flex items-center gap-3'>
											<Building2 className='h-4 w-4 text-muted-foreground' />
											<span className='text-sm'>
												{employee.department}
											</span>
										</div>
									)}
									{employee.address && (
										<div className='flex items-center gap-3'>
											<MapPin className='h-4 w-4 text-muted-foreground shrink-0' />
											<span className='text-sm'>
												{employee.address}
											</span>
										</div>
									)}
									{employee.joining_date && (
										<div className='flex items-center gap-3'>
											<Calendar className='h-4 w-4 text-muted-foreground' />
											<span className='text-sm'>
												Joined{" "}
												{new Date(
													employee.joining_date
												).toLocaleDateString()}
											</span>
										</div>
									)}
								</div>

								<Badge
									variant={
										employee.is_active
											? "default"
											: "secondary"
									}
									className={`mt-6 ${
										employee.is_active
											? "bg-success text-success-foreground"
											: ""
									}`}>
									{employee.is_active ? "Active" : "Inactive"}
								</Badge>
							</div>
						</CardContent>
					</Card>

					{/* Edit Profile Form */}
					<Card className='lg:col-span-2'>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<div>
									<CardTitle className='flex items-center gap-2'>
										<User className='h-5 w-5' />
										Profile Information
									</CardTitle>
									<CardDescription>
										Update your personal information
									</CardDescription>
								</div>
								{!isEditing ? (
									<Button
										variant='outline'
										onClick={() => setIsEditing(true)}>
										Edit Profile
									</Button>
								) : (
									<div className='flex gap-2'>
										<Button
											variant='outline'
											onClick={() => {
												setIsEditing(false);
												setFormData({
													first_name:
														employee.first_name,
													last_name:
														employee.last_name,
													phone: employee.phone || "",
													address:
														employee.address || "",
													date_of_birth:
														employee.date_of_birth ||
														"",
													joining_date:
														employee.joining_date
															? String(
																	employee.joining_date
															  ).slice(0, 10)
															: "",
												});
											}}>
											Cancel
										</Button>
										<Button
											onClick={handleSave}
											disabled={isSaving}>
											{isSaving ? (
												<Loader2 className='mr-2 h-4 w-4 animate-spin' />
											) : (
												<Save className='mr-2 h-4 w-4' />
											)}
											Save
										</Button>
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent className='space-y-6'>
							<div className='grid gap-6 md:grid-cols-2'>
								<div className='space-y-2'>
									<Label htmlFor='first_name'>
										First Name
									</Label>
									{isEditing ? (
										<Input
											id='first_name'
											value={formData.first_name}
											onChange={(e) =>
												setFormData({
													...formData,
													first_name: e.target.value,
												})
											}
										/>
									) : (
										<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
											{employee.first_name}
										</p>
									)}
								</div>
								<div className='space-y-2'>
									<Label htmlFor='last_name'>Last Name</Label>
									{isEditing ? (
										<Input
											id='last_name'
											value={formData.last_name}
											onChange={(e) =>
												setFormData({
													...formData,
													last_name: e.target.value,
												})
											}
										/>
									) : (
										<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
											{employee.last_name}
										</p>
									)}
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='email'>Email</Label>
								<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
									{employee.email}
								</p>
								<p className='text-xs text-muted-foreground'>
									Email cannot be changed
								</p>
							</div>

							<div className='grid gap-6 md:grid-cols-2'>
								<div className='space-y-2'>
									<Label htmlFor='phone'>Phone Number</Label>
									{isEditing ? (
										<Input
											id='phone'
											value={formData.phone}
											onChange={(e) =>
												setFormData({
													...formData,
													phone: e.target.value,
												})
											}
											placeholder='Enter phone number'
										/>
									) : (
										<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
											{employee.phone || "Not set"}
										</p>
									)}
								</div>
								<div className='space-y-2'>
									<Label htmlFor='date_of_birth'>
										Date of Birth
									</Label>
									{isEditing ? (
										<Input
											id='date_of_birth'
											type='date'
											value={formData.date_of_birth}
											onChange={(e) =>
												setFormData({
													...formData,
													date_of_birth:
														e.target.value,
												})
											}
										/>
									) : (
										<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
											{employee.date_of_birth
												? new Date(
														employee.date_of_birth
												  ).toLocaleDateString()
												: "Not set"}
										</p>
									)}
								</div>
								<div className='space-y-2'>
									<Label htmlFor='joining_date'>
										Joining Date
									</Label>
									{isEditing ? (
										<Input
											id='joining_date'
											type='date'
											value={formData.joining_date}
											onChange={(e) =>
												setFormData({
													...formData,
													joining_date:
														e.target.value,
												})
											}
										/>
									) : (
										<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
											{employee.joining_date
												? new Date(
														employee.joining_date
												  ).toLocaleDateString()
												: "Not set"}
										</p>
									)}
									{employee.employee_id && (
										<p className='text-xs text-muted-foreground'>
											Employee ID: {employee.employee_id}{" "}
											(updated when joining date changes)
										</p>
									)}
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='address'>Address</Label>
								{isEditing ? (
									<Input
										id='address'
										value={formData.address}
										onChange={(e) =>
											setFormData({
												...formData,
												address: e.target.value,
											})
										}
										placeholder='Enter your address (used on salary slip)'
									/>
								) : (
									<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
										{employee.address || "Not set"}
									</p>
								)}
							</div>

							{profileError && (
								<p className='text-sm text-destructive'>
									{profileError}
								</p>
							)}

							<Separator />

							<div className='grid gap-6 md:grid-cols-2'>
								<div className='space-y-2'>
									<Label className='flex items-center gap-2'>
										<Briefcase className='h-4 w-4' />
										Designation
									</Label>
									<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
										{employee.designation || "Not assigned"}
									</p>
								</div>
								<div className='space-y-2'>
									<Label className='flex items-center gap-2'>
										<Building2 className='h-4 w-4' />
										Department
									</Label>
									<p className='rounded-md border border-border bg-muted/50 px-3 py-2 text-sm'>
										{employee.department || "Not assigned"}
									</p>
								</div>
							</div>

							<p className='text-xs text-muted-foreground'>
								Contact HR to update your designation or
								department
							</p>

							<Separator />

							<div className='space-y-4'>
								<Label className='flex items-center gap-2'>
									<Lock className='h-4 w-4' />
									Change Password
								</Label>
								<div className='grid gap-4 md:grid-cols-1'>
									<div className='space-y-2'>
										<Label htmlFor='current_password'>
											Current Password (optional)
										</Label>
										<Input
											id='current_password'
											type='password'
											placeholder='••••••••'
											value={passwordForm.currentPassword}
											onChange={(e) =>
												setPasswordForm({
													...passwordForm,
													currentPassword:
														e.target.value,
												})
											}
										/>
									</div>
									<div className='space-y-2'>
										<Label htmlFor='new_password'>
											New Password
										</Label>
										<Input
											id='new_password'
											type='password'
											placeholder='••••••••'
											minLength={6}
											value={passwordForm.newPassword}
											onChange={(e) =>
												setPasswordForm({
													...passwordForm,
													newPassword: e.target.value,
												})
											}
										/>
									</div>
									<div className='space-y-2'>
										<Label htmlFor='confirm_new'>
											Confirm New Password
										</Label>
										<Input
											id='confirm_new'
											type='password'
											placeholder='••••••••'
											minLength={6}
											value={passwordForm.confirmPassword}
											onChange={(e) =>
												setPasswordForm({
													...passwordForm,
													confirmPassword:
														e.target.value,
												})
											}
										/>
									</div>
								</div>
								{passwordError && (
									<p className='text-sm text-destructive'>
										{passwordError}
									</p>
								)}
								{passwordSuccess && (
									<p className='text-sm text-success'>
										Password updated successfully.
									</p>
								)}
								<Button
									type='button'
									variant='outline'
									onClick={handleChangePassword}
									disabled={passwordLoading}>
									{passwordLoading ? (
										<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									) : (
										<Lock className='mr-2 h-4 w-4' />
									)}
									Update Password
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
