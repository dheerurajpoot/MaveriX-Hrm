"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import type { BulkInviteResult } from "./actions";
import { bulkInviteEmployees, checkExistingEmails } from "./actions";
import Image from "next/image";

export default function BulkInvitePage() {
	const [emails, setEmails] = useState<string[]>([]);
	const [existingEmails, setExistingEmails] = useState<string[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isChecking, setIsChecking] = useState(false);
	const [results, setResults] = useState<BulkInviteResult[]>([]);
	const [showResults, setShowResults] = useState(false);

	// Parse CSV file
	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Check file type
		if (!file.name.endsWith(".csv")) {
			toast.error("Please upload a CSV file");
			return;
		}

		try {
			const text = await file.text();
			const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

			// Find the EMAIL column
			const headers = lines[0].split(",").map((h) => h.trim().toUpperCase());
			const emailIndex = headers.findIndex((h) => h === "EMAIL");

			if (emailIndex === -1) {
				toast.error('CSV must contain an "EMAIL" column');
				return;
			}

			// Extract emails from the CSV
			const extractedEmails: string[] = [];
			for (let i = 1; i < lines.length; i++) {
				const columns = lines[i].split(",").map((c) => c.trim());
				const email = columns[emailIndex]?.toLowerCase();
				if (email && email.includes("@")) {
					extractedEmails.push(email);
				}
			}

			if (extractedEmails.length === 0) {
				toast.error("No valid email addresses found in CSV");
				return;
			}

			setEmails(extractedEmails);
			setShowResults(false);
			setResults([]);
			toast.success(`Loaded ${extractedEmails.length} email(s) from CSV`);

			// Check for existing emails
			setIsChecking(true);
			const result = await checkExistingEmails(extractedEmails);
			setIsChecking(false);

			if (result.ok) {
				setExistingEmails(result.existingEmails);
				if (result.existingEmails.length > 0) {
					toast(`${result.existingEmails.length} email(s) already exist in the system`, {
						icon: "⚠️",
					});
				}
			}
		} catch (error) {
			toast.error("Failed to parse CSV file");
			console.error(error);
		}

		// Reset file input
		e.target.value = "";
	};

	// Remove an email from the list
	const handleRemoveEmail = (emailToRemove: string) => {
		setEmails(emails.filter((e) => e !== emailToRemove));
		setExistingEmails(existingEmails.filter((e) => e !== emailToRemove));
	};

	// Send invitations
	const handleSendInvites = async () => {
		if (emails.length === 0) {
			toast.error("Please upload a CSV file with email addresses");
			return;
		}

		setIsProcessing(true);
		setShowResults(false);

		// HR can only invite employees with "employee" role
		const inputs = emails.map((email) => ({
			email,
			role: "employee" as const,
		}));

		const result = await bulkInviteEmployees(inputs);
		setIsProcessing(false);

		if (result.ok) {
			setResults(result.results);
			setShowResults(true);

			const successCount = result.results.filter((r) => r.success).length;
			const failCount = result.results.filter((r) => !r.success && !r.skipped).length;
			const skipCount = result.results.filter((r) => r.skipped).length;

			if (successCount > 0) {
				toast.success(`Successfully invited ${successCount} employee(s)`);
			}
			if (skipCount > 0) {
				toast(`Skipped ${skipCount} existing email(s)`, { icon: "⚠️" });
			}
			if (failCount > 0) {
				toast.error(`Failed to invite ${failCount} employee(s)`);
			}

			// Clear successful emails from the list
			const failedEmails = result.results
				.filter((r) => !r.success)
				.map((r) => r.email);
			setEmails(failedEmails);
			setExistingEmails([]);
		} else {
			toast.error(result.error);
		}
	};

	// Reset the form
	const handleReset = () => {
		setEmails([]);
		setExistingEmails([]);
		setResults([]);
		setShowResults(false);
	};

	return (
		<div className="flex flex-col">
			<DashboardHeader
				title="Bulk Employee Invitation"
				description="Invite multiple employees at once by uploading a CSV file"
			/>

			<div className="flex-1 space-y-6 p-6">
				{/* Branding Card */}
				<Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10">
					<CardContent className="flex items-center justify-center py-8">
						<div className="text-center space-y-2">
							<Image
								src="/maverix-logo.png"
								alt="MaveriX - Smart HRM"
								width={120}
								height={120}
								className="mx-auto"
							/>
							<p className="text-sm text-muted-foreground">Bulk Employee Invitation System</p>
						</div>
					</CardContent>
				</Card>

				{/* Upload and Settings */}
				<Card>
					<CardHeader>
						<CardTitle>Upload CSV File</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="csv-upload">
								CSV File <span className="text-muted-foreground">(must contain an "EMAIL" column)</span>
							</Label>
							<div className="flex items-center gap-4">
								<Input
									id="csv-upload"
									type="file"
									accept=".csv"
									onChange={handleFileUpload}
									className="flex-1"
									disabled={isProcessing}
								/>
								<Button
									variant="outline"
									onClick={handleReset}
									disabled={emails.length === 0 || isProcessing}>
									<X className="mr-2 h-4 w-4" />
									Clear
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								Upload a CSV file with email addresses. The file must have a column named "EMAIL".
							</p>
							<div className="mt-2 rounded-md bg-muted/50 p-3">
								<p className="text-xs font-medium mb-1">CSV Format Example:</p>
								<pre className="text-xs text-muted-foreground font-mono">
									EMAIL
									john.doe@example.com
									jane.smith@example.com
									mike.johnson@example.com
								</pre>
							</div>
						</div>

						<div className="rounded-lg bg-muted p-3">
							<p className="text-sm text-muted-foreground">
								As an HR user, all invited employees will be assigned the <Badge variant="outline">Employee</Badge> role.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Email List */}
				{emails.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>
								Email Addresses ({emails.length})
								{isChecking && (
									<span className="ml-2 text-sm text-muted-foreground">
										<Loader2 className="inline h-4 w-4 animate-spin" /> Checking...
									</span>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="max-h-96 overflow-y-auto rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Email Address</TableHead>
												<TableHead>Status</TableHead>
												<TableHead className="w-[70px]">Action</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{emails.map((email) => (
												<TableRow key={email}>
													<TableCell className="font-mono text-sm">{email}</TableCell>
													<TableCell>
														{existingEmails.includes(email) ? (
															<Badge variant="secondary" className="gap-1">
																<AlertCircle className="h-3 w-3" />
																Already Exists
															</Badge>
														) : (
															<Badge variant="outline" className="gap-1">
																<CheckCircle2 className="h-3 w-3" />
																Ready
															</Badge>
														)}
													</TableCell>
													<TableCell>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8"
															onClick={() => handleRemoveEmail(email)}
															disabled={isProcessing}>
															<X className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>

								<div className="flex items-center justify-between rounded-lg bg-muted p-4">
									<div className="space-y-1">
										<p className="text-sm font-medium">
											Total: {emails.length} email(s)
										</p>
										{existingEmails.length > 0 && (
											<p className="text-xs text-muted-foreground">
												{existingEmails.length} email(s) already exist and will be skipped
											</p>
										)}
									</div>
									<Button onClick={handleSendInvites} disabled={isProcessing || emails.length === 0}>
										{isProcessing ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Sending Invitations...
											</>
										) : (
											<>
												<Upload className="mr-2 h-4 w-4" />
												Send Invitations
											</>
										)}
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Results */}
				{showResults && results.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Invitation Results</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="max-h-96 overflow-y-auto rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Email Address</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Details</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{results.map((result) => (
											<TableRow key={result.email}>
												<TableCell className="font-mono text-sm">{result.email}</TableCell>
												<TableCell>
													{result.success ? (
														<Badge variant="default" className="gap-1 bg-success text-success-foreground">
															<CheckCircle2 className="h-3 w-3" />
															Success
														</Badge>
													) : result.skipped ? (
														<Badge variant="secondary" className="gap-1">
															<AlertCircle className="h-3 w-3" />
															Skipped
														</Badge>
													) : (
														<Badge variant="destructive" className="gap-1">
															<XCircle className="h-3 w-3" />
															Failed
														</Badge>
													)}
												</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{result.success
														? "Invitation sent successfully"
														: result.reason || result.error || "Unknown error"}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
