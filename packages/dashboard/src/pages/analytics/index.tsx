import { AnalyticsTabs, Card, FullscreenLoader } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject } from "../../lib/hooks/projects";

import { Ring } from "@uiball/loaders";
import dayjs from "dayjs";
import { ArrowDown, ArrowUp } from "lucide-react";
import React from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useAnalytics } from "../../lib/hooks/analytics";

export const valueFormatter = (number: number) => {
	if (number > 999999999) {
		return `${Intl.NumberFormat("us")
			.format(number / 1000000000)
			.toString()}B`;
	}

	if (number > 999999) {
		return `${Intl.NumberFormat("us")
			.format(number / 1000000)
			.toString()}M`;
	}

	if (number > 999) {
		return `${Intl.NumberFormat("us")
			.format(number / 1000)
			.toString()}K`;
	}

	return Intl.NumberFormat("us").format(number).toString();
};

/**
 *
 */
export default function Index() {
	const project = useActiveProject();
	const { data: analytics } = useAnalytics();

	if (!project) {
		return <FullscreenLoader />;
	}

	return (
		<>
			<Dashboard>
				<AnalyticsTabs />

				<div className={"grid grid-cols-2 gap-6"}>
					<Card>
						{analytics ? (
							<div className={"flex items-center"}>
								<div>
									<p className={"font-medium text-neutral-600"}>Bounce Rate</p>
									<p className={"text-2xl font-semibold text-neutral-800"}>
										<>
											{(
												(analytics.emails.bounced / analytics.emails.total) *
												100
											).toFixed(2)}
											%
										</>
									</p>
								</div>
								<div className={"flex flex-1 justify-end"}>
									{analytics.emails.bounced / analytics.emails.total >
									analytics.emails.bouncedPrev / analytics.emails.totalPrev ? (
										<>
											<span
												className={
													"flex items-center gap-1 text-sm font-medium text-neutral-500"
												}
											>
												{Number.isNaN(
													(analytics.emails.bounced / analytics.emails.total -
														analytics.emails.bouncedPrev /
															analytics.emails.totalPrev) *
														100,
												)
													? 0
													: (
															(analytics.emails.bounced /
																analytics.emails.total -
																analytics.emails.bouncedPrev /
																	analytics.emails.totalPrev) *
															100
														).toFixed(2)}
												%
												<ArrowUp className={"text-red-400"} size={24} />
											</span>
										</>
									) : (
										<>
											<span
												className={
													"flex items-center gap-1 text-sm font-medium text-neutral-500"
												}
											>
												{Number.isNaN(
													(analytics.emails.bounced / analytics.emails.total -
														analytics.emails.bouncedPrev /
															analytics.emails.totalPrev) *
														100,
												)
													? 0
													: (
															(analytics.emails.bounced /
																analytics.emails.total -
																analytics.emails.bouncedPrev /
																	analytics.emails.totalPrev) *
															100
														).toFixed(2)}
												%
												<ArrowDown className={"text-green-400"} size={24} />
											</span>
										</>
									)}
								</div>
							</div>
						) : (
							<>
								<div className={"flex h-[55px] items-center justify-center"}>
									<Ring size={32} color={"#a3a3a3"} />
								</div>
							</>
						)}
					</Card>
					<Card>
						{analytics ? (
							<div className={"flex items-center"}>
								<div>
									<p className={"font-medium text-neutral-600"}>Spam Rate</p>
									<p className={"text-2xl font-semibold text-neutral-800"}>
										<>
											{(
												(analytics.emails.complaint / analytics.emails.total) *
												100
											).toFixed(2)}
											%
										</>
									</p>
								</div>
								<div className={"flex flex-1 justify-end"}>
									{analytics.emails.complaint / analytics.emails.total >
									analytics.emails.complaintPrev /
										analytics.emails.totalPrev ? (
										<>
											<span
												className={
													"flex items-center gap-1 text-sm font-medium text-neutral-500"
												}
											>
												{Number.isNaN(
													(analytics.emails.complaint / analytics.emails.total -
														analytics.emails.complaintPrev /
															analytics.emails.totalPrev) *
														100,
												)
													? 0
													: (
															(analytics.emails.complaint /
																analytics.emails.total -
																analytics.emails.complaintPrev /
																	analytics.emails.totalPrev) *
															100
														).toFixed(2)}
												%
												<ArrowUp className={"text-red-400"} size={24} />
											</span>
										</>
									) : (
										<>
											<span
												className={
													"flex items-center gap-1 text-sm font-medium text-neutral-500"
												}
											>
												{Number.isNaN(
													(analytics.emails.complaint / analytics.emails.total -
														analytics.emails.complaintPrev /
															analytics.emails.totalPrev) *
														100,
												)
													? 0
													: (
															(analytics.emails.complaint /
																analytics.emails.total -
																analytics.emails.complaintPrev /
																	analytics.emails.totalPrev) *
															100
														).toFixed(2)}
												%
												<ArrowDown className={"text-green-400"} size={24} />
											</span>
										</>
									)}
								</div>
							</div>
						) : (
							<>
								<div className={"flex h-[55px] items-center justify-center"}>
									<Ring size={32} color={"#a3a3a3"} />
								</div>
							</>
						)}
					</Card>
					<Card title={"Contacts"} className={"col-span-2"}>
						{analytics ? (
							<>
								<ResponsiveContainer width={"100%"} height={300}>
									<AreaChart
										width={500}
										height={300}
										data={analytics.contacts.timeseries
											.sort((a, b) => {
												return (
													new Date(a.day).getTime() - new Date(b.day).getTime()
												);
											})
											.map((i) => {
												return {
													day: dayjs(i.day).format("MMM DD"),
													count: i.count,
												};
											})}
										margin={{
											top: 20,
											right: 20,
											left: 20,
											bottom: 0,
										}}
									>
										<CartesianGrid strokeDasharray="4 5" />
										<defs>
											<linearGradient
												id="gradientFill"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="100%"
													stopColor="#2563eb"
													stopOpacity={0.4}
												/>
												<stop
													offset="100%"
													stopColor="#93c5fd"
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>

										<YAxis
											axisLine={false}
											domain={[
												0,
												analytics.contacts.timeseries.length === 0
													? 10
													: analytics.contacts.timeseries[
															analytics.contacts.timeseries.length - 1
														].count * 1.1,
											]}
											fill={"#fff"}
											tickSize={0}
											width={5}
											interval={0}
										/>

										<XAxis
											tickSize={0}
											stroke={"#fff"}
											dataKey="day"
											interval={3}
											tick={({ x, y, payload }) => {
												return (
													<g transform={`translate(${x},${y})`}>
														<text
															x={0}
															y={0}
															dy={16}
															fill={"#666"}
															textAnchor={"middle"}
															className="text-sm" // Add your custom class name here
														>
															{payload.value}
														</text>
													</g>
												);
											}}
										/>

										<Tooltip
											content={({ active, payload, label }) => {
												if (active && payload?.length) {
													// Customize the tooltip content here
													const dataPoint = payload[0];
													return (
														<div className="rounded border border-neutral-100 bg-white px-5 py-3 shadow-sm">
															<p className="font-medium text-neutral-800">{`${label}`}</p>
															<p className="text-neutral-600">
																{valueFormatter(dataPoint.value as number)}
															</p>
														</div>
													);
												}

												return null;
											}}
										/>

										<Area
											type="basis"
											dataKey="count"
											stroke="#2563eb"
											fill="url(#gradientFill)"
											strokeWidth={2}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</>
						) : (
							<>
								<div className={"flex h-[300px] items-center justify-center"}>
									<Ring size={32} color={"#a3a3a3"} />
								</div>
							</>
						)}
					</Card>
					<Card title={"Retention Rate"}>
						{analytics ? (
							<>
								<ResponsiveContainer width="100%" height={200}>
									<PieChart width={300} height={300}>
										<Tooltip
											content={({ active, payload }) => {
												if (active && payload?.length) {
													// Customize the tooltip content here
													const dataPoint = payload[0];
													return (
														<div className="rounded border border-neutral-100 bg-white px-5 py-3 shadow-sm">
															<p className="font-medium text-neutral-800">{`${dataPoint.name}`}</p>
															<p className="text-neutral-600">
																{valueFormatter(dataPoint.value as number)}
															</p>
														</div>
													);
												}

												return null;
											}}
										/>

										<Pie
											data={[
												{
													name: "Subscribed",
													value: analytics.contacts.subscribed,
												},
												{
													name: "Unsubscribed",
													value: analytics.contacts.unsubscribed,
												},
											]}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({
												cx,
												cy,
												midAngle,
												innerRadius,
												outerRadius,
												percent,
											}) => {
												const radius =
													innerRadius + (outerRadius - innerRadius) * 0.5;
												const x =
													cx + radius * Math.cos((-midAngle * Math.PI) / 180);
												const y =
													cy + radius * Math.sin((-midAngle * Math.PI) / 180);

												if (percent < 0.1) {
													return null;
												}

												return (
													<text
														x={x}
														y={y}
														fill={percent > 0.5 ? "white" : "#666"}
														className={"text-sm font-semibold"}
														textAnchor={x > cx ? "start" : "middle"}
														dominantBaseline="central"
													>
														{`${(percent * 100).toFixed(0)}%`}
													</text>
												);
											}}
											outerRadius={90}
											fill="#8884d8"
											dataKey="value"
										>
											{[
												{
													name: "Subscribed",
													value: analytics.contacts.subscribed,
												},
												{
													name: "Unsubscribed",
													value: analytics.contacts.unsubscribed,
												},
											].map((entry, index) => (
												<Cell
													style={{ outline: "none" }}
													key={`cell-${entry.name}`}
													fill={["#3b82f6", "#e5e5e5"][index % 2]}
												/>
											))}
										</Pie>
									</PieChart>
								</ResponsiveContainer>
							</>
						) : (
							<>
								<div className={"flex h-[200px] items-center justify-center"}>
									<Ring size={32} color={"#a3a3a3"} />
								</div>
							</>
						)}
					</Card>
					<Card title={"Open rate"}>
						{analytics ? (
							<>
								<ResponsiveContainer width="100%" height={200}>
									<PieChart width={300} height={300}>
										<Tooltip
											content={({ active, payload }) => {
												if (active && payload?.length) {
													// Customize the tooltip content here
													const dataPoint = payload[0];
													return (
														<div className="rounded border border-neutral-100 bg-white px-5 py-3 shadow-sm">
															<p className="font-medium text-neutral-800">{`${dataPoint.name}`}</p>
															<p className="text-neutral-600">
																{valueFormatter(dataPoint.value as number)}
															</p>
														</div>
													);
												}

												return null;
											}}
										/>

										<Pie
											data={[
												{ name: "Opened", value: analytics.emails.opened },

												{
													name: "Unopened",
													value:
														analytics.emails.total -
														analytics.emails.opened -
														analytics.emails.bounced -
														analytics.emails.complaint,
												},
											]}
											cx="50%"
											cy="50%"
											labelLine={false}
											label={({
												cx,
												cy,
												midAngle,
												innerRadius,
												outerRadius,
												percent,
											}) => {
												const radius =
													innerRadius + (outerRadius - innerRadius) * 0.5;
												const x =
													cx + radius * Math.cos((-midAngle * Math.PI) / 180);
												const y =
													cy + radius * Math.sin((-midAngle * Math.PI) / 180);

												if (percent < 0.1) {
													return null;
												}

												return (
													<text
														x={x}
														y={y}
														fill={percent > 0.5 ? "white" : "#666"}
														className={"text-sm font-semibold"}
														textAnchor={x > cx ? "start" : "middle"}
														dominantBaseline="central"
													>
														{`${(percent * 100).toFixed(0)}%`}
													</text>
												);
											}}
											outerRadius={90}
											fill="#8884d8"
											dataKey="value"
										>
											{[
												{ name: "Opened", value: analytics.emails.opened },

												{
													name: "Unopened",
													value:
														analytics.emails.total -
														analytics.emails.opened -
														analytics.emails.bounced -
														analytics.emails.complaint,
												},
											].map((entry, index) => (
												<Cell
													style={{ outline: "none" }}
													key={`cell-${entry.name}`}
													fill={["#3b82f6", "#e5e5e5"][index % 2]}
												/>
											))}
										</Pie>
									</PieChart>
								</ResponsiveContainer>
							</>
						) : (
							<>
								<div className={"flex h-[200px] items-center justify-center"}>
									<Ring size={32} color={"#a3a3a3"} />
								</div>
							</>
						)}
					</Card>
				</div>
			</Dashboard>
		</>
	);
}
