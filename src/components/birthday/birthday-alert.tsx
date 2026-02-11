"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BirthdayConfetti } from "./birthday-confetti";
import type { Employee } from "@/lib/types";

interface BirthdayAlertProps {
	employee: Employee;
	onDismiss: () => void;
}

const WISHING_MESSAGES = [
	"Wishing you a day filled with joy and a year ahead full of success!",
	"May your special day be as amazing as you are. Happy Birthday!",
	"Here's to another great year. Enjoy your day!",
	"Wishing you health, happiness, and all the best on your birthday!",
];

export function BirthdayAlert({ employee, onDismiss }: BirthdayAlertProps) {
	const message =
		WISHING_MESSAGES[
			(employee.id?.length ?? 0) % WISHING_MESSAGES.length
		] ?? WISHING_MESSAGES[0];
	const name = `${employee.first_name} ${employee.last_name}`.trim();

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300'>
			<BirthdayConfetti />
			<div className='relative w-full max-w-md rounded-2xl border-2 border-pink-400/80 bg-linear-to-b from-pink-50 to-white dark:from-pink-950/40 dark:to-background shadow-2xl animate-in zoom-in-95 duration-300 ring-4 ring-pink-400/20 overflow-hidden'>
				<div className='relative p-6 sm:p-8'>
					<div className='flex flex-col items-center text-center mb-6'>
						<Avatar className='h-24 w-24 border-4 border-pink-300 dark:border-pink-600 shadow-lg mb-4'>
							{employee.avatar_url ? (
								<AvatarImage
									className='object-cover'
									src={employee.avatar_url}
									alt={name}
								/>
							) : null}
							<AvatarFallback className='text-2xl bg-pink-200 dark:bg-pink-800 text-pink-900 dark:text-pink-100'>
								{employee.first_name?.[0]}
								{employee.last_name?.[0]}
							</AvatarFallback>
						</Avatar>
						<h2 className='text-2xl font-bold text-foreground mb-1'>
							Happy Birthday!
						</h2>
						<p className='text-lg font-semibold text-pink-600 dark:text-pink-400'>
							{name}
						</p>
					</div>
					<p className='text-foreground/90 text-sm leading-relaxed mb-6 text-center'>
						{message}
					</p>
					<Button
						onClick={onDismiss}
						className='w-full rounded-full bg-pink-600 hover:bg-pink-700 text-white'>
						Thank you!
					</Button>
				</div>
			</div>
		</div>
	);
}
