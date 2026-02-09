"use client";

import { motion } from "framer-motion";
import {
	ArrowRight,
	Users,
	Clock,
	Shield,
	Zap,
	TrendingUp,
	BarChart,
	CheckCircle,
	Building2,
	Star,
	Rocket,
	Award,
	Globe,
	Lock,
	Cloud,
	Briefcase,
	Target,
	PieChart,
	FileText,
	Settings,
	UserCheck,
	DollarSign,
	TrendingDown,
	Sparkles,
	Book,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
	const features = [
		{
			icon: Users,
			title: "Employee Management",
			description:
				"Manage employee profiles, roles, documents, and lifecycle from onboarding to exit — all in one place.",
			gradient: "from-blue-500 to-cyan-500",
			iconBg: "bg-blue-100",
			iconColor: "text-blue-600",
		},
		{
			icon: Clock,
			title: "Attendance & Leave",
			description:
				"Track attendance, leaves, holidays, and working hours with real-time visibility and accuracy.",
			gradient: "from-purple-500 to-pink-500",
			iconBg: "bg-purple-100",
			iconColor: "text-purple-600",
		},
		{
			icon: DollarSign,
			title: "Payroll Management",
			description:
				"Automate salary calculations, deductions, payslips, and payroll reports with minimal manual effort.",
			gradient: "from-orange-500 to-red-500",
			iconBg: "bg-orange-100",
			iconColor: "text-orange-600",
		},
		{
			icon: BarChart,
			title: "Performance & Analytics",
			description:
				"Monitor employee performance, productivity, and growth using actionable insights and analytics.",
			gradient: "from-green-500 to-emerald-500",
			iconBg: "bg-green-100",
			iconColor: "text-green-600",
		},
		{
			icon: Shield,
			title: "Secure Access & Roles",
			description:
				"Role-based access ensures sensitive HR data remains protected and accessible only to authorized users.",
			gradient: "from-indigo-500 to-purple-500",
			iconBg: "bg-indigo-100",
			iconColor: "text-indigo-600",
		},
		{
			icon: Zap,
			title: "Workflow Automation",
			description:
				"Automate repetitive HR tasks and streamline workflows to save time and reduce manual errors.",
			gradient: "from-yellow-500 to-orange-500",
			iconBg: "bg-yellow-100",
			iconColor: "text-yellow-600",
		},
	];

	const stats = [
		{
			icon: Users,
			label: "Active Users",
			value: "50+",
			color: "text-blue-600",
		},
		{
			icon: Zap,
			label: "Average Load Time",
			value: "<3s",
			color: "text-purple-600",
		},
		{
			icon: Award,
			label: "Success Rate",
			value: "99%",
			color: "text-green-600",
		},
		{
			icon: Globe,
			label: "Cloud Availability",
			value: "24/7",
			color: "text-orange-600",
		},
	];

	const benefits = [
		{ text: "Easy-to-use & intuitive interface", icon: Target },
		{ text: "Cloud-based & accessible anywhere", icon: Cloud },
		{ text: "Customizable workflows", icon: Settings },
		{ text: "Scalable for future growth", icon: TrendingUp },
		{ text: "Secure & compliant HR data handling", icon: Lock },
	];

	const useCases = [
		{
			icon: Rocket,
			title: "Startups & Growing Companies",
			desc: "Perfect for scaling teams",
			color: "from-blue-500 to-cyan-500",
		},
		{
			icon: Briefcase,
			title: "HR Teams & Managers",
			desc: "Streamline HR operations",
			color: "from-purple-500 to-pink-500",
		},
		{
			icon: Building2,
			title: "Enterprises with Distributed Teams",
			desc: "Manage global workforce",
			color: "from-orange-500 to-red-500",
		},
		{
			icon: TrendingUp,
			title: "Remote & Hybrid Workforces",
			desc: "Work from anywhere",
			color: "from-green-500 to-emerald-500",
		},
	];

	const trustBadges = [
		{ icon: Lock, text: "SSL Secured" },
		{ icon: Cloud, text: "Cloud Hosted" },
		{ icon: Shield, text: "Data Protected" },
		{ icon: Award, text: "ISO Certified" },
	];

	return (
		<div className='relative min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50'>
			{/* Subtle Background Pattern */}
			<div className='fixed inset-0 z-0 opacity-30'>
				<div
					className='absolute inset-0'
					style={{
						backgroundImage: `radial-gradient(circle at 25px 25px, rgba(99, 102, 241, 0.05) 2%, transparent 0%),
                            radial-gradient(circle at 75px 75px, rgba(236, 72, 153, 0.05) 2%, transparent 0%)`,
						backgroundSize: "100px 100px",
					}}></div>
			</div>

			{/* Navigation */}
			{/* <nav className='sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm'>
				<div className='max-w-7xl mx-auto px-6 py-4'>
					<div className='flex items-center justify-center'>
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}>
							<Book size='md' className='mx-auto' />
						</motion.div>
					</div>
				</div>
			</nav> */}

			{/* Scrollable Content */}
			<div className='relative z-10'>
				{/* Hero Section */}
				<section className='relative px-6 py-12 md:py-16 overflow-hidden'>
					{/* Enhanced Decorative Elements */}
					<div className='absolute top-10 right-10 w-64 h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-20 animate-pulse'></div>
					<div
						className='absolute bottom-10 left-10 w-72 h-72 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-20 animate-pulse'
						style={{ animationDelay: "1s" }}></div>

					{/* Floating Icons */}
					<motion.div
						className='absolute top-20 left-20 hidden lg:block'
						animate={{ y: [0, -20, 0] }}
						transition={{ duration: 3, repeat: Infinity }}>
						<div className='w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-xl flex items-center justify-center rotate-12'>
							<Users className='w-8 h-8 text-white' />
						</div>
					</motion.div>
					<motion.div
						className='absolute top-40 right-32 hidden lg:block'
						animate={{ y: [0, 20, 0] }}
						transition={{
							duration: 4,
							repeat: Infinity,
							delay: 0.5,
						}}>
						<div className='w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-xl flex items-center justify-center -rotate-12'>
							<BarChart className='w-7 h-7 text-white' />
						</div>
					</motion.div>
					<motion.div
						className='absolute bottom-32 right-20 hidden lg:block'
						animate={{ y: [0, -15, 0] }}
						transition={{
							duration: 3.5,
							repeat: Infinity,
							delay: 1,
						}}>
						<div className='w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-xl flex items-center justify-center rotate-6'>
							<Clock className='w-6 h-6 text-white' />
						</div>
					</motion.div>

					<div className='max-w-6xl mx-auto text-center relative'>
						{/* Badge */}
						<motion.div
							initial={{ opacity: 0, y: -20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							className='inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-full px-4 py-2 mb-6'>
							<Sparkles className='w-4 h-4 text-purple-600' />
							<span className='text-sm font-semibold text-purple-700'>
								The Future of HR Management
							</span>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							className='mb-4'>
							<h1 className='text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight'>
								<span className='bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent'>
									MaveriX
								</span>{" "}
								<span className='text-gray-900'>
									– Smart HRM Software
								</span>
								<br />
								<span className='text-gray-800 text-2xl md:text-4xl lg:text-5xl'>
									to Manage Your Workforce Effortlessly
								</span>
							</h1>

							<p className='text-base md:text-lg text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed'>
								An all-in-one HR Management System designed to
								simplify employee management, payroll,
								attendance, performance tracking, and HR
								operations — built for modern businesses.
							</p>
						</motion.div>

						{/* CTA Buttons */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.3 }}
							className='flex flex-col sm:flex-row gap-3 justify-center items-center mb-8'>
							<Link href='/auth/login'>
								<motion.button
									whileHover={{
										scale: 1.05,
										boxShadow:
											"0 20px 40px rgba(139, 92, 246, 0.4)",
									}}
									whileTap={{ scale: 0.95 }}
									className='px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold text-white text-base flex items-center gap-2 shadow-lg transition-all'>
									<Rocket className='w-4 h-4' />
									Get Started Free
									<ArrowRight className='w-4 h-4' />
								</motion.button>
							</Link>
						</motion.div>

						{/* Trust Badges */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.5 }}
							className='flex flex-wrap justify-center gap-6 mb-8'>
							{trustBadges.map((badge, index) => (
								<motion.div
									key={index}
									whileHover={{ scale: 1.05 }}
									className='flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-md border border-gray-200'>
									<badge.icon className='w-4 h-4 text-purple-600' />
									<span className='text-sm font-medium text-gray-700'>
										{badge.text}
									</span>
								</motion.div>
							))}
						</motion.div>

						{/* Stats */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.7 }}
							className='grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto'>
							{stats.map((stat, index) => (
								<motion.div
									key={index}
									whileHover={{ y: -5 }}
									className='bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200'>
									<stat.icon
										className={`w-8 h-8 ${stat.color} mx-auto mb-2`}
									/>
									<div className='text-2xl font-bold text-gray-900'>
										{stat.value}
									</div>
									<div className='text-xs text-gray-600'>
										{stat.label}
									</div>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* What is MaveriX Section */}
				<section className='relative px-6 py-10 bg-gradient-to-br from-white via-purple-50/30 to-white'>
					<div className='max-w-6xl mx-auto'>
						<div className='grid md:grid-cols-2 gap-8 items-center'>
							{/* Left - Icon Grid */}
							<motion.div
								initial={{ opacity: 0, x: -30 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.8 }}
								viewport={{ once: true }}
								className='grid grid-cols-2 gap-4'>
								<motion.div
									whileHover={{ scale: 1.05 }}
									className='bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl'>
									<Users className='w-12 h-12 mb-3' />
									<h3 className='font-bold text-lg mb-1'>
										Employee
									</h3>
									<p className='text-sm opacity-90'>
										Management
									</p>
								</motion.div>
								<motion.div
									whileHover={{ scale: 1.05 }}
									className='bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl mt-8'>
									<Clock className='w-12 h-12 mb-3' />
									<h3 className='font-bold text-lg mb-1'>
										Attendance
									</h3>
									<p className='text-sm opacity-90'>
										Tracking
									</p>
								</motion.div>
								<motion.div
									whileHover={{ scale: 1.05 }}
									className='bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl'>
									<DollarSign className='w-12 h-12 mb-3' />
									<h3 className='font-bold text-lg mb-1'>
										Payroll
									</h3>
									<p className='text-sm opacity-90'>
										Automation
									</p>
								</motion.div>
								<motion.div
									whileHover={{ scale: 1.05 }}
									className='bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl mt-8'>
									<BarChart className='w-12 h-12 mb-3' />
									<h3 className='font-bold text-lg mb-1'>
										Analytics
									</h3>
									<p className='text-sm opacity-90'>
										Insights
									</p>
								</motion.div>
							</motion.div>

							{/* Right - Content */}
							<motion.div
								initial={{ opacity: 0, x: 30 }}
								whileInView={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.8 }}
								viewport={{ once: true }}>
								<div className='inline-flex items-center gap-2 bg-purple-100 rounded-full px-4 py-2 mb-4'>
									<Award className='w-4 h-4 text-purple-600' />
									<span className='text-sm font-semibold text-purple-700'>
										About MaveriX
									</span>
								</div>
								<h2 className='text-2xl md:text-4xl font-bold text-gray-900 mb-4'>
									What is MaveriX HRM Software?
								</h2>
								<p className='text-base text-gray-600 leading-relaxed mb-4'>
									MaveriX is a modern, cloud-based Human
									Resource Management (HRM) software that
									helps companies streamline HR processes,
									manage employees efficiently, and make
									data-driven decisions.
								</p>
								<p className='text-base text-gray-600 leading-relaxed'>
									From onboarding to payroll and performance
									tracking, MaveriX centralizes all HR
									activities in one powerful platform that
									scales as your team grows.
								</p>
							</motion.div>
						</div>
					</div>
				</section>

				{/* Features Section */}
				<section className='relative px-6 py-10 bg-gradient-to-br from-gray-50 to-blue-50'>
					<div className='max-w-7xl mx-auto'>
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							viewport={{ once: true }}
							className='text-center mb-8'>
							<h2 className='text-2xl md:text-4xl font-bold text-gray-900 mb-2'>
								Powerful Features of MaveriX HRM
							</h2>
						</motion.div>

						<div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{features.map((feature, index) => (
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 30 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{
										duration: 0.5,
										delay: index * 0.1,
									}}
									viewport={{ once: true }}
									whileHover={{
										y: -8,
										boxShadow:
											"0 20px 40px rgba(0,0,0,0.15)",
									}}
									className='group bg-white rounded-xl p-6 shadow-lg transition-all border border-gray-100 relative overflow-hidden'>
									{/* Gradient Background on Hover */}
									<div
										className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

									<div className='relative'>
										<div
											className={`w-14 h-14 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
											<feature.icon
												className={`w-7 h-7 ${feature.iconColor}`}
											/>
										</div>
										<h3 className='text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors'>
											{feature.title}
										</h3>
										<p className='text-sm text-gray-600 leading-relaxed'>
											{feature.description}
										</p>

										{/* Arrow Icon */}
										<div className='mt-4 flex items-center text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity'>
											<span className='text-sm font-semibold mr-2'>
												Learn More
											</span>
											<ArrowRight className='w-4 h-4' />
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</div>
				</section>

				{/* Who Can Use Section */}
				<section className='relative px-6 py-10 bg-white'>
					<div className='max-w-6xl mx-auto'>
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							viewport={{ once: true }}
							className='text-center mb-6'>
							<h2 className='text-2xl md:text-4xl font-bold text-gray-900 mb-4'>
								Who Can Use MaveriX?
							</h2>
						</motion.div>

						<div className='grid md:grid-cols-2 lg:grid-cols-4 gap-4'>
							{useCases.map((useCase, index) => (
								<motion.div
									key={index}
									initial={{ opacity: 0, scale: 0.9 }}
									whileInView={{ opacity: 1, scale: 1 }}
									transition={{
										duration: 0.5,
										delay: index * 0.1,
									}}
									viewport={{ once: true }}
									whileHover={{ scale: 1.08, y: -5 }}
									className='group relative bg-white rounded-xl p-6 text-center border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all overflow-hidden'>
									{/* Gradient Background */}
									<div
										className={`absolute inset-0 bg-gradient-to-br ${useCase.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

									<div className='relative'>
										<div
											className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${useCase.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
											<useCase.icon className='w-8 h-8 text-white' />
										</div>
										<h3 className='text-sm font-bold text-gray-900 mb-2'>
											{useCase.title}
										</h3>
										<p className='text-xs text-gray-600'>
											{useCase.desc}
										</p>
									</div>
								</motion.div>
							))}
						</div>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.4 }}
							viewport={{ once: true }}
							className='text-center text-base text-gray-600 mt-6 max-w-3xl mx-auto'>
							MaveriX is designed to reduce HR workload and
							improve operational efficiency for organizations of
							all sizes.
						</motion.p>
					</div>
				</section>

				{/* Why Choose Section */}
				<section className='relative px-6 py-10 bg-gradient-to-br from-purple-600 to-pink-600'>
					<div className='max-w-6xl mx-auto'>
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							viewport={{ once: true }}
							className='text-center mb-6'>
							<h2 className='text-2xl md:text-4xl font-bold text-white mb-4'>
								Why Choose MaveriX HRM?
							</h2>
						</motion.div>

						<div className='grid md:grid-cols-2 gap-4 mb-6'>
							{benefits.map((benefit, index) => (
								<motion.div
									key={index}
									initial={{ opacity: 0, x: -20 }}
									whileInView={{ opacity: 1, x: 0 }}
									transition={{
										duration: 0.5,
										delay: index * 0.1,
									}}
									viewport={{ once: true }}
									whileHover={{ scale: 1.03, x: 5 }}
									className='flex items-center gap-4 bg-white/15 backdrop-blur-sm rounded-xl p-5 border border-white/30 hover:bg-white/20 transition-all shadow-lg'>
									<div className='w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0'>
										<benefit.icon className='w-5 h-5 text-white' />
									</div>
									<span className='text-white text-base font-medium'>
										{benefit.text}
									</span>
								</motion.div>
							))}
						</div>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.5 }}
							viewport={{ once: true }}
							className='text-center text-lg text-white font-semibold'>
							MaveriX empowers HR teams to focus on people — not
							paperwork.
						</motion.p>
					</div>
				</section>

				{/* Final CTA Section */}
				<section className='relative px-6 py-12 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 overflow-hidden'>
					{/* Decorative Elements */}
					<div className='absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl'></div>
					<div className='absolute bottom-0 left-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl'></div>

					{/* Floating Icons */}
					<motion.div
						className='absolute top-10 left-20 hidden lg:block'
						animate={{ rotate: 360 }}
						transition={{
							duration: 20,
							repeat: Infinity,
							ease: "linear",
						}}>
						<Star className='w-8 h-8 text-white/20' />
					</motion.div>
					<motion.div
						className='absolute bottom-10 right-20 hidden lg:block'
						animate={{ rotate: -360 }}
						transition={{
							duration: 25,
							repeat: Infinity,
							ease: "linear",
						}}>
						<Sparkles className='w-10 h-10 text-white/20' />
					</motion.div>

					<div className='max-w-5xl mx-auto text-center relative'>
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							viewport={{ once: true }}>
							{/* Icon Badge */}
							<div className='flex justify-center mb-6'>
								<div className='bg-white/20 backdrop-blur-sm rounded-2xl p-4 inline-flex items-center gap-3'>
									<Rocket className='w-6 h-6 text-white' />
									<Target className='w-6 h-6 text-white' />
									<TrendingUp className='w-6 h-6 text-white' />
								</div>
							</div>

							<h2 className='text-2xl md:text-4xl font-bold text-white mb-4'>
								Transform Your HR Operations with MaveriX
							</h2>
							<p className='text-base md:text-lg text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed'>
								Simplify HR processes, improve employee
								experience, and gain full control over workforce
								management with MaveriX.
							</p>

							<div className='flex flex-col sm:flex-row gap-3 justify-center items-center mb-8'>
								<Link href='/auth/login'>
									<motion.button
										whileHover={{
											scale: 1.05,
											boxShadow:
												"0 20px 40px rgba(0,0,0,0.3)",
										}}
										whileTap={{ scale: 0.95 }}
										className='px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-base flex items-center gap-2 shadow-2xl transition-all'>
										<Rocket className='w-5 h-5' />
										Start Using MaveriX Today
										<ArrowRight className='w-5 h-5' />
									</motion.button>
								</Link>
							</div>

							{/* Trust Indicators */}
							<div className='flex flex-wrap justify-center gap-6 text-white/80 text-sm'>
								<div className='flex items-center gap-2'>
									<CheckCircle className='w-5 h-5 text-green-300' />
									<span>No credit card required</span>
								</div>
								<div className='flex items-center gap-2'>
									<CheckCircle className='w-5 h-5 text-green-300' />
									<span>Free forever plan</span>
								</div>
								<div className='flex items-center gap-2'>
									<CheckCircle className='w-5 h-5 text-green-300' />
									<span>Cancel anytime</span>
								</div>
							</div>
						</motion.div>
					</div>
				</section>

				{/* Footer */}
				<footer className='relative px-6 py-8 bg-gray-900 text-white'>
					<div className='max-w-7xl mx-auto text-center'>
						<p className='text-gray-400 text-sm mb-2'>© MaveriX - Smart HRM</p>
						<p className='text-gray-500 text-xs'>
							All Rights Reserved. Made with ❤️ by{" "}
							<a
								href='https://iconicchandu.online/'
								className='text-white hover:text-gray-300'>
								Iconic Chandu
							</a>
						</p>
					</div>
				</footer>
			</div>
		</div>
	);
}
