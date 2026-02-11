"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Megaphone, Send, Calendar } from "lucide-react";

function todayStr() {
	return new Date().toISOString().slice(0, 10);
}

interface CreateAnnouncementDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: () => void;
	canCreate: boolean;
	createdBy: string | null;
}

export function CreateAnnouncementDialog({
	open,
	onOpenChange,
	onCreated,
	canCreate,
	createdBy,
}: CreateAnnouncementDialogProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [date, setDate] = useState(todayStr());
	const [addPoll, setAddPoll] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const reset = () => {
		setTitle("");
		setContent("");
		setDate(todayStr());
		setAddPoll(false);
	};

	const handleCreate = async () => {
		if (!title.trim() || !content.trim() || !canCreate || !createdBy)
			return;
		setIsSubmitting(true);
		const { createClient } = await import("@/lib/supabase/client");
		const supabase = createClient();
		await supabase.from("announcements").insert({
			title: title.trim(),
			content: content.trim(),
			date,
			created_by: createdBy,
		});
		reset();
		onCreated();
		onOpenChange(false);
		setIsSubmitting(false);
	};

	const handleClose = (open: boolean) => {
		if (!open) reset();
		onOpenChange(open);
	};

	const isValid = title.trim().length > 0 && content.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className='sm:max-w-[480px] p-0 gap-0 overflow-hidden'>
				<DialogHeader className='flex flex-row items-center gap-3 px-6 pt-6 pb-4 border-b'>
					<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
						<Megaphone className='h-5 w-5' />
					</div>
					<DialogTitle className='text-left flex-1'>
						Create Announcement
					</DialogTitle>
				</DialogHeader>

				<div className='px-6 py-5 space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='ann-title'>
							Title <span className='text-destructive'>*</span>
						</Label>
						<Input
							id='ann-title'
							placeholder='Enter announcement title.'
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className='rounded-md'
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='ann-content'>
							Content <span className='text-destructive'>*</span>
						</Label>
						<Textarea
							id='ann-content'
							placeholder='Enter announcement content.'
							value={content}
							onChange={(e) => setContent(e.target.value)}
							className='min-h-[100px] resize-y rounded-md'
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='ann-date'>
							Date <span className='text-destructive'>*</span>
						</Label>
						<div className='relative'>
							<Input
								id='ann-date'
								type='date'
								value={date}
								onChange={(e) => setDate(e.target.value)}
								className='rounded-md pr-10'
							/>
							<Calendar className='absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none' />
						</div>
					</div>
					{/* <label className='flex items-center gap-2 cursor-pointer'>
						<input
							type='checkbox'
							checked={addPoll}
							onChange={(e) => setAddPoll(e.target.checked)}
							className='h-4 w-4 rounded border-input'
						/>
						<BarChart3 className='h-4 w-4 text-muted-foreground' />
						<span className='text-sm'>Add Poll</span>
					</label> */}
				</div>

				<div className='flex items-center justify-end gap-2 px-6 pb-6 pt-2'>
					<Button
						variant='outline'
						onClick={() => handleClose(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleCreate}
						disabled={!isValid || isSubmitting}
						className='gap-2'>
						<Send className='h-4 w-4' />
						{isSubmitting ? "Creating…" : "Create Announcement"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
