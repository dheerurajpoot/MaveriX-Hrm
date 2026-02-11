"use client";

import { Gift } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Employee } from "@/lib/types";

interface BirthdayBarProps {
	birthdayEmployees: Employee[];
}

export function BirthdayBar({ birthdayEmployees }: BirthdayBarProps) {
	if (birthdayEmployees.length === 0) return null;

	const names = birthdayEmployees
		.map((e) => `${e.first_name} ${e.last_name}`.trim())
		.join(", ");
	const label =
		birthdayEmployees.length === 1
			? "Birthday today"
			: `${birthdayEmployees.length} birthdays today`;

	return (
		<div className='sticky top-0 z-40 flex items-center justify-center gap-3 border-b border-pink-200 dark:border-pink-800 bg-linear-to-r from-pink-50 to-rose-50 dark:from-pink-950/50 dark:to-rose-950/50 px-4 py-2.5 text-pink-900 dark:text-pink-100'>
			<Gift className='h-4 w-4 shrink-0 text-pink-600 dark:text-pink-400' />
			<div className='flex flex-wrap items-center justify-center gap-2'>
				{birthdayEmployees.map((emp) => (
					<div
						key={emp.id}
						className='flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-pink-900/30 px-2 py-1 shadow-sm'>
						<Avatar className='h-6 w-6 border border-pink-200 dark:border-pink-700'>
							{emp.avatar_url ? (
								<AvatarImage
									className='object-cover'
									src={emp.avatar_url}
									alt={`${emp.first_name} ${emp.last_name}`}
								/>
							) : null}
							<AvatarFallback className='text-[10px] bg-pink-200 dark:bg-pink-800 text-pink-900 dark:text-pink-100'>
								{emp.first_name?.[0]}
								{emp.last_name?.[0]}
							</AvatarFallback>
						</Avatar>
						<span className='text-xs font-medium'>
							{emp.first_name} {emp.last_name}
						</span>
					</div>
				))}
			</div>
			<span className='text-sm font-medium'>
				{label} — Wishing them a wonderful day!
			</span>
		</div>
	);
}
