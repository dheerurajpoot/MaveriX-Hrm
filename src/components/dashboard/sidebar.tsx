"use client";

import React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "../../contexts/user-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
	LayoutDashboard,
	Users,
	Clock,
	Calendar,
	DollarSign,
	UserMinus,
	LogOut,
	UsersRound,
	User,
	Rss,
	Megaphone,
	Settings,
	UserPlus,
} from "lucide-react";
import Image from "next/image";
interface NavItem {
	label: string;
	href: string;
	icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
	{
		label: "Dashboard",
		href: "/admin/dashboard",
		icon: <LayoutDashboard className='h-5 w-5' />,
	},
	{
		label: "Feed",
		href: "/admin/feed",
		icon: <Rss className='h-5 w-5' />,
	},
	{
		label: "Announcements",
		href: "/admin/announcements",
		icon: <Megaphone className='h-5 w-5' />,
	},
	{
		label: "Employees",
		href: "/admin/employees",
		icon: <Users className='h-5 w-5' />,
	},
	{
		label: "Teams",
		href: "/admin/teams",
		icon: <UsersRound className='h-5 w-5' />,
	},
	{
		label: "Attendance",
		href: "/admin/attendance",
		icon: <Clock className='h-5 w-5' />,
	},
	{
		label: "Leave Management",
		href: "/admin/leave",
		icon: <Calendar className='h-5 w-5' />,
	},
	{
		label: "Finance",
		href: "/admin/finance",
		icon: <DollarSign className='h-5 w-5' />,
	},
	{
		label: "Resignations",
		href: "/admin/resignations",
		icon: <UserMinus className='h-5 w-5' />,
	},
	{
		label: "Settings",
		href: "/admin/settings",
		icon: <Settings className='h-5 w-5' />,
	},
	{
		label: "Profile",
		href: "/admin/profile",
		icon: <User className='h-5 w-5' />,
	},
];

// HR: Personalize (HR is also an employee - manage own profile, leaves, attendance, salary)
const hrPersonalizeItems: NavItem[] = [
	{
		label: "Profile",
		href: "/hr/profile",
		icon: <User className='h-5 w-5' />,
	},
	{
		label: "Leave Request",
		href: "/hr/my-leave",
		icon: <Calendar className='h-5 w-5' />,
	},
	{
		label: "Attendance",
		href: "/hr/my-attendance",
		icon: <Clock className='h-5 w-5' />,
	},
	{
		label: "Finance",
		href: "/hr/my-finance",
		icon: <DollarSign className='h-5 w-5' />,
	},
];

// HR: Management (org-level)
const hrManagementItems: NavItem[] = [
	{
		label: "Dashboard",
		href: "/hr/dashboard",
		icon: <LayoutDashboard className='h-5 w-5' />,
	},
	{
		label: "Feed",
		href: "/hr/feed",
		icon: <Rss className='h-5 w-5' />,
	},
	{
		label: "Announcements",
		href: "/hr/announcements",
		icon: <Megaphone className='h-5 w-5' />,
	},
	{
		label: "Employees",
		href: "/hr/employees",
		icon: <Users className='h-5 w-5' />,
	},
	{
		label: "Teams",
		href: "/hr/teams",
		icon: <UsersRound className='h-5 w-5' />,
	},
	{
		label: "Attendance",
		href: "/hr/attendance",
		icon: <Clock className='h-5 w-5' />,
	},
	{
		label: "Leave Management",
		href: "/hr/leave",
		icon: <Calendar className='h-5 w-5' />,
	},
	{
		label: "Finance",
		href: "/hr/finance",
		icon: <DollarSign className='h-5 w-5' />,
	},
	{
		label: "Resignations",
		href: "/hr/resignations",
		icon: <UserMinus className='h-5 w-5' />,
	},
];

const employeeNavItems: NavItem[] = [
	{
		label: "Dashboard",
		href: "/employee/dashboard",
		icon: <LayoutDashboard className='h-5 w-5' />,
	},
	{
		label: "Feed",
		href: "/employee/feed",
		icon: <Rss className='h-5 w-5' />,
	},
	{
		label: "My Attendance",
		href: "/employee/attendance",
		icon: <Clock className='h-5 w-5' />,
	},
	{
		label: "Leave Requests",
		href: "/employee/leave",
		icon: <Calendar className='h-5 w-5' />,
	},
	{
		label: "Finance",
		href: "/employee/finance",
		icon: <DollarSign className='h-5 w-5' />,
	},
	{
		label: "Resignation",
		href: "/employee/resignation",
		icon: <UserMinus className='h-5 w-5' />,
	},
	{
		label: "Profile",
		href: "/employee/profile",
		icon: <User className='h-5 w-5' />,
	},
];

/** All nav items for mobile (same as sidebar): 5 visible in frame, rest scroll right */
function getMobileNavItems(role: string | undefined): NavItem[] {
	if (role === "admin") return adminNavItems;
	if (role === "hr") return [...hrManagementItems, ...hrPersonalizeItems];
	if (role === "employee") return employeeNavItems;
	return [];
}

function NavLink({
	item,
	isActive,
	className,
}: {
	item: NavItem;
	isActive: boolean;
	className?: string;
}) {
	return (
		<Link
			href={item.href}
			className={cn(
				"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
				isActive
					? "bg-sidebar-accent text-sidebar-accent-foreground"
					: "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
				className
			)}>
			{item.icon}
			{item.label}
		</Link>
	);
}

export function MobileBottomNav() {
	const pathname = usePathname();
	const { employee, signOut } = useUser();
	const items = getMobileNavItems(employee?.role);

	if (items.length === 0) return null;

	return (
		<nav className='fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] md:hidden'>
			{/* 5 icons visible in frame; rest scroll right */}
			<div className='flex overflow-x-auto overflow-y-hidden scrollbar-hide'>
				{items.map((item) => (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"flex shrink-0 w-[20%] min-w-[72px] max-w-[84px] flex-col items-center justify-center gap-0.5 py-3 text-[10px] transition-colors",
							pathname === item.href ||
								pathname.startsWith(item.href + "/")
								? "text-primary"
								: "text-muted-foreground"
						)}>
						{item.icon}
						<span className='truncate px-0.5 text-center'>
							{item.label}
						</span>
					</Link>
				))}
				<button
					onClick={signOut}
					className="flex shrink-0 w-[20%] min-w-[72px] max-w-[84px] flex-col items-center justify-center gap-0.5 py-3 text-[10px] transition-colors text-muted-foreground hover:text-destructive">
					<LogOut className='h-5 w-5' />
					<span className='truncate px-0.5 text-center'>
						Logout
					</span>
				</button>
			</div>
		</nav>
	);
}

export function DashboardSidebar() {
	const pathname = usePathname();
	const { employee, signOut } = useUser();

	const getNavItems = () => {
		if (employee?.role === "admin") return adminNavItems;
		if (employee?.role === "hr") return null; // HR uses sections
		return employeeNavItems;
	};

	const navItems = getNavItems();
	const initials = employee
		? `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""
			}`.toUpperCase()
		: "U";

	return (
		<aside className='fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-sidebar text-sidebar-foreground md:flex'>
			{/* Logo */}
			<div className='flex gap-2 h-20 items-center justify-center border-b border-sidebar-border px-6'>
				<Image src="/maverix-whitelogo.png" alt="MaveriX - Smart HRM" width={100} height={100} />
				<div>
					{employee?.role === "admin" && (
						<span className='text-sm bg-red-700 px-2 py-0 rounded-full'>Admin</span>
					)}
					{employee?.role === "hr" && (
						<span className='text-sm bg-blue-700 px-2 py-0 rounded-full'>HR</span>
					)}
					{employee?.role === "employee" && (
						<span className='text-sm bg-green-700 px-2 py-0 rounded-full'>Employee</span>
					)}
				</div>
			</div>

			{/* Navigation */}
			<nav className='flex-1 space-y-1 overflow-y-auto px-3 py-4'>
				{employee?.role === "hr" ? (
					<>
						{hrManagementItems.map((item) => (
							<NavLink
								key={item.href}
								item={item}
								isActive={
									pathname === item.href ||
									pathname.startsWith(item.href + "/")
								}
							/>
						))}
						<div className='mb-2 px-3 py-1.5'>
							<p className='text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50'>
								Personalize
							</p>
						</div>
						{hrPersonalizeItems.map((item) => (
							<NavLink
								key={item.href}
								item={item}
								isActive={
									pathname === item.href ||
									pathname.startsWith(item.href + "/")
								}
							/>
						))}
					</>
				) : (
					navItems?.map((item) => (
						<NavLink
							key={item.href}
							item={item}
							isActive={
								pathname === item.href ||
								pathname.startsWith(item.href + "/")
							}
						/>
					)) ?? null
				)}
			</nav>

			{/* User Menu */}
			<div className='grid grid-cols-4 items-center gap-2 border-t border-sidebar-border p-3'>
				<div className='flex col-span-3 items-center justify-start gap-3 px-3 py-6 text-sidebar-foreground hover:bg-sidebar-accent'>
					<Avatar className='h-9 w-9'>
						{employee?.avatar_url ? (
							<AvatarImage
								className='object-cover'
								src={employee.avatar_url}
								alt={`${employee.first_name} ${employee.last_name}`}
							/>
						) : null}
						<AvatarFallback className='bg-sidebar-primary text-sidebar-primary-foreground'>
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className='flex flex-1 flex-col items-start text-left'>
						<span className='text-sm font-medium hover:text-gray-400'>
							{employee?.first_name} {employee?.last_name}
						</span>
						<span className='text-xs capitalize text-sidebar-foreground/60 hover:text-gray-400'>
							{employee?.role === "employee"
								? employee?.designation || "—"
								: employee?.role}
						</span>
					</div>
				</div>
				<Button
					variant='ghost'
					size='sm'
					className='col-span-1 cursor-pointer px-3 py-6 text-sidebar-foreground hover:bg-sidebar-accent hover:text-gray-400'
					onClick={signOut}>
					<LogOut className='h-5 w-5 text-destructive' />
				</Button>
			</div>
		</aside>
	);
}
