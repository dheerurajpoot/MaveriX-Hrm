"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "../../contexts/user-context";
import type { Employee } from "@/lib/types";
import Image from "next/image";
interface DashboardHeaderProps {
	title: string;
	description?: string;
	searchPlaceholder?: string;
	actions?: React.ReactNode;
}

export function DashboardHeader({
	title,
	description,
	searchPlaceholder = "Search employees...",
	actions,
}: DashboardHeaderProps) {
	const { employee } = useUser();
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<Employee[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
		null
	);
	const searchRef = useRef<HTMLDivElement>(null);

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 18) return "Good afternoon";
		return "Good evening";
	};

	const searchEmployees = useCallback(async (q: string) => {
		const trimmed = q.trim();
		if (!trimmed || trimmed.length < 2) {
			setSearchResults([]);
			return;
		}
		setIsSearching(true);
		const supabase = createClient();
		const term = `%${trimmed}%`;
		const { data } = await supabase
			.from("employees")
			.select(
				"id, first_name, last_name, email, phone, designation, department, employee_id, role, avatar_url, date_of_birth, joining_date, address"
			)
			.eq("is_active", true)
			.neq("role", "admin")
			.or(
				`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`
			)
			.limit(8);
		setSearchResults((data as Employee[]) || []);
		setIsSearching(false);
	}, []);

	useEffect(() => {
		const t = setTimeout(() => searchEmployees(searchQuery), 300);
		return () => clearTimeout(t);
	}, [searchQuery, searchEmployees]);

	useEffect(() => {
		setIsDropdownOpen(searchQuery.trim().length >= 2);
	}, [searchQuery]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				searchRef.current &&
				!searchRef.current.contains(e.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelectEmployee = (emp: Employee) => {
		setSearchQuery("");
		setIsDropdownOpen(false);
		setSearchResults([]);
		setSelectedEmployee(emp);
	};

	return (
		<>
			<header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/80 bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
				<div className='flex min-w-0 flex-1 justify-between items-center gap-3'>
					{/* Logo on mobile (sidebar hidden); matches sidebar branding */}
					<div className='flex shrink-0 items-center gap-2 md:hidden'>
						<Image src="/maverix-logo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
					</div>
					<div className='min-w-0'>
						<h1 className='text-lg font-semibold text-foreground truncate md:text-xl'>
							{title}
						</h1>
						{description && (
							<p className='text-sm text-muted-foreground'>
								{description}
							</p>
						)}
						{!description && employee && (
							<p className='text-xs text-muted-foreground truncate md:text-sm'>
								{getGreeting()}, {employee.first_name}
							</p>
						)}
					</div>
				</div>
				<div className='flex items-center gap-4'>
					<div className='relative hidden md:block' ref={searchRef}>
						<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
						<Input
							placeholder={searchPlaceholder}
							className='w-64 bg-muted/50 pl-9'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onFocus={() => {
								if (searchQuery.trim().length >= 2)
									setIsDropdownOpen(true);
							}}
						/>
						{isDropdownOpen && (
							<div className='absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-popover shadow-lg'>
								{isSearching ? (
									<div className='flex items-center gap-2 p-4 text-sm text-muted-foreground'>
										<Loader2 className='h-4 w-4 animate-spin' />
										Searching...
									</div>
								) : searchResults.length === 0 ? (
									<div className='p-4 text-sm text-muted-foreground'>
										No employees found
									</div>
								) : (
									<div className='max-h-64 overflow-y-auto py-1'>
										{searchResults.map((emp) => {
											const name =
												`${emp.first_name || ""} ${
													emp.last_name || ""
												}`.trim() || emp.email;
											return (
												<button
													key={emp.id}
													type='button'
													className='flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/80'
													onClick={() =>
														handleSelectEmployee(
															emp
														)
													}>
													<Avatar className='h-8 w-8'>
														{emp.avatar_url ? (
															<AvatarImage src={emp.avatar_url} alt={name} />
														) : null}
														<AvatarFallback className='text-xs'>
															{(emp
																.first_name?.[0] ||
																"") +
																(emp
																	.last_name?.[0] ||
																	"") || "?"}
														</AvatarFallback>
													</Avatar>
													<div className='min-w-0 flex-1'>
														<p className='truncate font-medium'>
															{name}
														</p>
														<p className='truncate text-xs text-muted-foreground'>
															{emp.designation ||
																emp.email}
														</p>
													</div>
												</button>
											);
										})}
									</div>
								)}
							</div>
						)}
					</div>
					{actions}
				</div>
			</header>

			<Dialog
				open={!!selectedEmployee}
				onOpenChange={(open) => !open && setSelectedEmployee(null)}>
				<DialogContent className='max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto'>
					<DialogHeader className="sr-only">
						<DialogTitle>Employee Details</DialogTitle>
					</DialogHeader>
					{selectedEmployee && (
						<>
							<div className='relative h-28 bg-gradient-to-r from-primary/80 to-primary'>
								<div className='absolute -bottom-12 left-1/2 -translate-x-1/2'>
									<Avatar className='h-24 w-24 ring-4 ring-background'>
										{selectedEmployee.avatar_url ? (
											<AvatarImage 
												src={selectedEmployee.avatar_url} 
												alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
												className="object-cover"
											/>
										) : null}
										<AvatarFallback className='text-2xl bg-muted'>
											{(selectedEmployee.first_name?.[0] || "") +
												(selectedEmployee.last_name?.[0] || "") || "?"}
										</AvatarFallback>
									</Avatar>
								</div>
							</div>
							<div className='pt-14 pb-6 px-6'>
								<div className='text-center mb-6'>
									<h3 className='text-xl font-semibold text-foreground'>
										{selectedEmployee.first_name} {selectedEmployee.last_name}
									</h3>
									<p className='text-sm text-muted-foreground mt-1 capitalize'>
										{selectedEmployee.designation || "No designation"}
									</p>
									{selectedEmployee.role && (
										<span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-2 capitalize'>
											{selectedEmployee.role}
										</span>
									)}
								</div>
								
								<div className='space-y-3'>
									{/* Email */}
									<div className='flex items-center gap-3 p-3 rounded-lg bg-muted/50'>
										<div className='h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
											<svg className='h-4 w-4 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
												<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
											</svg>
										</div>
										<div className='min-w-0 flex-1'>
											<p className='text-xs text-muted-foreground uppercase tracking-wide'>Email</p>
											<p className='text-sm font-medium truncate'>{selectedEmployee.email}</p>
										</div>
									</div>
									
									{/* Phone */}
									{selectedEmployee.phone && (
										<div className='flex items-center gap-3 p-3 rounded-lg bg-muted/50'>
											<div className='h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
												<svg className='h-4 w-4 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
												</svg>
											</div>
											<div className='flex-1'>
												<p className='text-xs text-muted-foreground uppercase tracking-wide'>Phone</p>
												<p className='text-sm font-medium'>{selectedEmployee.phone}</p>
											</div>
										</div>
									)}
									
									{/* Employee ID */}
									{selectedEmployee.employee_id && (
										<div className='flex items-center gap-3 p-3 rounded-lg bg-muted/50'>
											<div className='h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
												<svg className='h-4 w-4 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3 3 0 00-3 3m3-3a3 3 0 013 3m-3 3v2m6-6v2' />
												</svg>
											</div>
											<div className='flex-1'>
												<p className='text-xs text-muted-foreground uppercase tracking-wide'>Employee ID</p>
												<p className='text-sm font-medium'>{selectedEmployee.employee_id}</p>
											</div>
										</div>
									)}
									
									{/* Department */}
									{selectedEmployee.department && (
										<div className='flex items-center gap-3 p-3 rounded-lg bg-muted/50'>
											<div className='h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
												<svg className='h-4 w-4 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
												</svg>
											</div>
											<div className='flex-1'>
												<p className='text-xs text-muted-foreground uppercase tracking-wide'>Department</p>
												<p className='text-sm font-medium'>{selectedEmployee.department}</p>
											</div>
										</div>
									)}
									
									{/* Joining Date */}
									{selectedEmployee.joining_date && (
										<div className='flex items-center gap-3 p-3 rounded-lg bg-muted/50'>
											<div className='h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
												<svg className='h-4 w-4 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' />
												</svg>
											</div>
											<div className='flex-1'>
												<p className='text-xs text-muted-foreground uppercase tracking-wide'>Joining Date</p>
												<p className='text-sm font-medium'>
													{new Date(selectedEmployee.joining_date).toLocaleDateString('en-US', { 
														day: 'numeric', 
														month: 'long', 
														year: 'numeric' 
													})}
												</p>
											</div>
										</div>
									)}
									
									{/* Date of Birth */}
									{selectedEmployee.date_of_birth && (
										<div className='flex items-center gap-3 p-3 rounded-lg bg-muted/50'>
											<div className='h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0'>
												<svg className='h-4 w-4 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z' />
												</svg>
											</div>
											<div className='flex-1'>
												<p className='text-xs text-muted-foreground uppercase tracking-wide'>Date of Birth</p>
												<p className='text-sm font-medium'>
													{new Date(selectedEmployee.date_of_birth).toLocaleDateString('en-US', { 
														day: 'numeric', 
														month: 'long', 
														year: 'numeric' 
													})}
												</p>
											</div>
										</div>
									)}
									
									{/* Address */}
									{selectedEmployee.address && (
										<div className='flex items-start gap-3 p-3 rounded-lg bg-muted/50'>
											<div className='h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5'>
												<svg className='h-4 w-4 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
												</svg>
											</div>
											<div className='flex-1'>
												<p className='text-xs text-muted-foreground uppercase tracking-wide'>Address</p>
												<p className='text-sm font-medium leading-relaxed'>{selectedEmployee.address}</p>
											</div>
										</div>
									)}
								</div>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
