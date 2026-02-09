"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/contexts/user-context";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Send, Rss, Trash2 } from "lucide-react";
import type { Post } from "@/lib/types";
import type { Employee } from "@/lib/types";

type EmployeeMention = Pick<
	Employee,
	"id" | "first_name" | "last_name" | "designation" | "role"
>;

export function FeedPage() {
	const { employee } = useUser();
	const [posts, setPosts] = useState<Post[]>([]);
	const [newPost, setNewPost] = useState("");
	const [isPosting, setIsPosting] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [selectedPost, setSelectedPost] = useState<Post | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [employees, setEmployees] = useState<EmployeeMention[]>([]);
	const [mentionOpen, setMentionOpen] = useState(false);
	const [mentionQuery, setMentionQuery] = useState("");
	const [mentionIndex, setMentionIndex] = useState(0);
	const [mentionStartPos, setMentionStartPos] = useState(0);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const mentionListRef = useRef<HTMLDivElement>(null);

	const fetchPosts = useCallback(async () => {
		const supabase = createClient();
		const { data } = await supabase
			.from("posts")
			.select("*, author:employees(*)")
			.order("created_at", { ascending: false })
			.limit(50);
		setPosts((data as unknown as Post[]) || []);
		setIsLoading(false);
	}, []);

	useEffect(() => {
		fetchPosts();
	}, [fetchPosts]);

	useEffect(() => {
		const supabase = createClient();
		supabase
			.from("employees")
			.select("id, first_name, last_name, designation, role")
			.eq("is_active", true)
			.then(({ data }) => setEmployees(data || []));
	}, []);

	// Filter employees for @mention (by name or designation)
	const mentionCandidates = mentionQuery.trim()
		? employees.filter((emp) => {
				const full = `${emp.first_name} ${emp.last_name}`.toLowerCase();
				const des = (emp.designation || "").toLowerCase();
				const q = mentionQuery.toLowerCase();
				return full.includes(q) || des.includes(q);
		  })
		: employees.slice(0, 8);

	const openMentionAt = (value: string, cursorPos: number) => {
		const before = value.slice(0, cursorPos);
		const lastAt = before.lastIndexOf("@");
		if (lastAt === -1) {
			setMentionOpen(false);
			return;
		}
		const afterAt = before.slice(lastAt + 1);
		if (/\s/.test(afterAt)) {
			setMentionOpen(false);
			return;
		}
		setMentionStartPos(lastAt);
		setMentionQuery(afterAt);
		setMentionOpen(true);
		setMentionIndex(0);
	};

	const insertMention = (emp: EmployeeMention) => {
		const name = `@${emp.first_name} ${emp.last_name} `;
		const before = newPost.slice(0, mentionStartPos);
		const after = newPost.slice(
			textareaRef.current?.selectionStart ?? newPost.length
		);
		setNewPost(before + name + after);
		setMentionOpen(false);
		setMentionQuery("");
		setTimeout(() => {
			const pos = before.length + name.length;
			textareaRef.current?.setSelectionRange(pos, pos);
			textareaRef.current?.focus();
		}, 0);
	};

	const handlePost = async () => {
		if (!newPost.trim() || !employee) return;
		setIsPosting(true);
		setMentionOpen(false);
		const supabase = createClient();
		const { data, error } = await supabase
			.from("posts")
			.insert({ author_id: employee.id, content: newPost })
			.select("*, author:employees(*)")
			.single();
		if (!error && data) {
			setPosts([data as unknown as Post, ...posts]);
			setNewPost("");
		}
		setIsPosting(false);
	};

	const handleDeletePost = async (postId: string) => {
		if (!employee) return;
		const supabase = createClient();
		await supabase.from("posts").delete().eq("id", postId);
		setPosts((prev) => prev.filter((p) => p.id !== postId));
		if (selectedPost?.id === postId) {
			setDialogOpen(false);
			setSelectedPost(null);
		}
	};

	const canDeletePost = (post: Post) => {
		if (!employee) return false;
		const authorId = (post as { author_id?: string }).author_id;
		return employee.id === authorId || employee.role === "admin";
	};

	const onViewFullPost = (post: Post) => {
		setSelectedPost(post);
		setDialogOpen(true);
	};

	const initials = employee
		? `${employee.first_name?.[0] || ""}${
				employee.last_name?.[0] || ""
		  }`.toUpperCase()
		: "U";

	return (
		<div className='flex flex-col'>
			<DashboardHeader title='Feed' description='Share updates' />
			<div className='flex-1 space-y-6 p-6'>
				<div className='mx-auto flex max-w-5xl flex-col gap-6'>
					{/* Composer */}
					<Card className='border-none bg-background shadow-sm p-0'>
						<CardContent className='p-3'>
							<div className='flex gap-4'>
								<Avatar className='h-12 w-12 shrink-0'>
									{employee?.avatar_url ? (
										<AvatarImage
											src={employee.avatar_url}
											alt={`${employee.first_name} ${employee.last_name}`}
										/>
									) : null}
									<AvatarFallback className='bg-primary text-primary-foreground'>
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className='flex-1 space-y-3 relative'>
									<p className='text-sm font-medium text-foreground'>
										{employee
											? `${employee.first_name} ${employee.last_name}`
											: "Share an update"}
									</p>
									<Textarea
										ref={textareaRef}
										placeholder="What's on your mind? Type @ to mention someone..."
										value={newPost}
										onChange={(e) => {
											const v = e.target.value;
											setNewPost(v);
											openMentionAt(
												v,
												e.target.selectionStart ??
													v.length
											);
										}}
										onSelect={(e) => {
											const t =
												e.target as HTMLTextAreaElement;
											openMentionAt(
												newPost,
												t.selectionStart ?? 0
											);
										}}
										onKeyDown={(e) => {
											if (!mentionOpen) return;
											if (e.key === "ArrowDown") {
												e.preventDefault();
												setMentionIndex((i) =>
													Math.min(
														i + 1,
														mentionCandidates.length -
															1
													)
												);
												return;
											}
											if (e.key === "ArrowUp") {
												e.preventDefault();
												setMentionIndex((i) =>
													Math.max(0, i - 1)
												);
												return;
											}
											if (
												e.key === "Enter" &&
												mentionCandidates.length > 0
											) {
												e.preventDefault();
												insertMention(
													mentionCandidates[
														mentionIndex
													]
												);
												return;
											}
											if (e.key === "Escape") {
												setMentionOpen(false);
											}
										}}
										className='min-h-[100px] resize-none rounded-2xl border-muted bg-muted/40 px-4 py-3 text-sm'
									/>
									{mentionOpen &&
										mentionCandidates.length > 0 && (
											<div
												ref={mentionListRef}
												className='absolute left-0 right-0 top-full z-50 mt-1 max-h-[220px] overflow-auto rounded-lg border border-border bg-popover shadow-md'>
												{mentionCandidates.map(
													(emp, i) => (
														<button
															key={emp.id}
															type='button'
															onClick={() =>
																insertMention(
																	emp
																)
															}
															className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none ${
																i ===
																mentionIndex
																	? "bg-muted"
																	: ""
															}`}>
															<Avatar className='h-7 w-7 shrink-0'>
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
															<div className='min-w-0'>
																<p className='font-medium truncate'>
																	{
																		emp.first_name
																	}{" "}
																	{
																		emp.last_name
																	}
																</p>
																{(emp.designation ||
																	(emp.role !==
																		"employee" &&
																		emp.role)) && (
																	<p className='text-xs text-muted-foreground truncate'>
																		{emp.role ===
																		"employee"
																			? emp.designation ||
																			  "—"
																			: [
																					emp.designation,
																					emp.role,
																			  ]
																					.filter(
																						Boolean
																					)
																					.join(
																						" · "
																					)}
																	</p>
																)}
															</div>
														</button>
													)
												)}
											</div>
										)}
									<div className='flex justify-start'>
										<Button
											onClick={handlePost}
											disabled={
												!newPost.trim() || isPosting
											}
											className='gap-2 rounded-full bg-linear-to-r from-primary to-primary/80 px-6 shadow-sm'>
											<Send className='h-4 w-4' />
											Post
										</Button>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Posts List */}
					<div className='space-y-4'>
						{isLoading ? (
							<p className='py-8 text-center text-sm text-muted-foreground'>
								Loading feed...
							</p>
						) : posts.length === 0 ? (
							<p className='py-8 text-center text-sm text-muted-foreground'>
								No posts yet. Be the first to share something!
							</p>
						) : (
							<div className='flex flex-col gap-4 md:flex-row md:flex-wrap'>
								{posts.map((post) => {
									const anyPost = post as any;
									const createdAt = new Date(
										anyPost.created_at
									);
									return (
										<Card
											key={post.id}
											className='border-none bg-background shadow-sm md:w-[320px]'>
											<CardContent className='p-5'>
												<div className='flex flex-col gap-3'>
													<div className='flex items-center justify-between gap-3'>
														<div className='flex items-center gap-2 min-w-0'>
															<Avatar className='h-8 w-8 shrink-0'>
																{anyPost.author
																	?.avatar_url ? (
																	<AvatarImage
																		src={
																			anyPost
																				.author
																				.avatar_url
																		}
																		alt={`${anyPost.author.first_name} ${anyPost.author.last_name}`}
																	/>
																) : null}
																<AvatarFallback className='bg-muted text-xs'>
																	{
																		anyPost
																			.author
																			?.first_name?.[0]
																	}
																	{
																		anyPost
																			.author
																			?.last_name?.[0]
																	}
																</AvatarFallback>
															</Avatar>
															<div className='min-w-0'>
																<p className='truncate text-sm font-semibold'>
																	{
																		anyPost
																			.author
																			?.first_name
																	}{" "}
																	{
																		anyPost
																			.author
																			?.last_name
																	}
																</p>
																<p className='text-[11px] text-muted-foreground'>
																	{anyPost
																		.author
																		?.role ===
																	"employee"
																		? anyPost
																				.author
																				?.designation ||
																		  "—"
																		: [
																				anyPost
																					.author
																					?.designation,
																				anyPost
																					.author
																					?.role,
																		  ]
																				.filter(
																					Boolean
																				)
																				.join(
																					" · "
																				) ||
																		  "—"}{" "}
																	·{" "}
																	{createdAt.toLocaleDateString()}{" "}
																	•{" "}
																	{createdAt.toLocaleTimeString(
																		[],
																		{
																			hour: "2-digit",
																			minute: "2-digit",
																		}
																	)}
																</p>
															</div>
														</div>
														<div className='flex items-center gap-1 shrink-0'>
															{canDeletePost(
																post
															) && (
																<Button
																	size='icon'
																	variant='ghost'
																	className='h-8 w-8 text-muted-foreground hover:text-destructive'
																	onClick={() =>
																		handleDeletePost(
																			post.id
																		)
																	}
																	title='Delete post'>
																	<Trash2 className='h-3.5 w-3.5' />
																</Button>
															)}
															<button
																type='button'
																onClick={() =>
																	onViewFullPost(
																		post
																	)
																}
																className='text-[11px] text-primary hover:underline'>
																View Full Post
															</button>
														</div>
													</div>
													<p className='mt-1 line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap'>
														{anyPost.content}
													</p>
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className='max-w-lg'>
					{selectedPost && (
						<>
							<DialogHeader>
								<DialogTitle className='flex items-center justify-between gap-2'>
									<span className='flex items-center gap-2'>
										<Rss className='h-4 w-4 text-primary' />
										Post from{" "}
										<span className='font-semibold'>
											{
												(selectedPost as any).author
													?.first_name
											}{" "}
											{
												(selectedPost as any).author
													?.last_name
											}
										</span>
									</span>
									{canDeletePost(selectedPost) && (
										<Button
											size='sm'
											variant='ghost'
											className='text-destructive hover:text-destructive'
											onClick={() => {
												handleDeletePost(
													selectedPost.id
												);
												setDialogOpen(false);
											}}>
											<Trash2 className='h-4 w-4' />
										</Button>
									)}
								</DialogTitle>
								<DialogDescription className='text-xs'>
									{(selectedPost as any).author?.role ===
									"employee"
										? (selectedPost as any).author
												?.designation || "—"
										: [
												(selectedPost as any).author
													?.designation,
												(selectedPost as any).author
													?.role,
										  ]
												.filter(Boolean)
												.join(" · ") || "—"}{" "}
									·{" "}
									{new Date(
										(selectedPost as any).created_at
									).toLocaleString()}
								</DialogDescription>
							</DialogHeader>
							<div className='mt-3 text-sm text-muted-foreground whitespace-pre-wrap'>
								{(selectedPost as any).content}
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
