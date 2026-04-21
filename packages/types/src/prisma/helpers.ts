/**
 * Type-safe utilities for working with Prisma JSON fields
 *
 * Prisma's JSON types are intentionally loose to support the dynamic nature of JSON.
 * These helpers provide a safer interface while acknowledging the runtime limitations.
 */

import {Prisma} from '@plunk/db';

import type {ResolvedWorkflowGraph, WorkflowSnapshot, WorkflowSnapshotStep, WorkflowSnapshotTransition} from './extended.js';

export function toPrismaJson<T>(value: T | null | undefined): Prisma.InputJsonValue {
	// Prisma.InputJsonValue accepts: string | number | boolean | null | JsonObject | JsonArray
	// We trust that T is JSON-serializable at runtime (including null)
	return value as unknown as Prisma.InputJsonValue;
}

export function fromPrismaJson<T>(value: Prisma.JsonValue): T {
	return value as unknown as T;
}

/**
 * Optional version of fromPrismaJson that handles null/undefined
 *
 * @template T - The expected type
 * @param value - The JSON value from Prisma (may be null/undefined)
 * @returns The value as type T or undefined
 */
export function fromPrismaJsonOptional<T>(value: Prisma.JsonValue | null | undefined): T | undefined {
	if (value === null || value === undefined) {
		return undefined;
	}
	return value as unknown as T;
}

/**
 * Build a workflow snapshot from a workflow with fully loaded steps, transitions, and templates.
 * Call this at execution start time to freeze the graph.
 */
export function buildWorkflowSnapshot(workflow: {
	id: string;
	name: string;
	triggerType: string;
	triggerConfig: Prisma.JsonValue;
	steps: Array<{
		id: string;
		type: string;
		name: string;
		config: Prisma.JsonValue;
		templateId: string | null;
		template?: {
			id: string;
			subject: string;
			body: string;
			from: string;
			fromName: string | null;
			replyTo: string | null;
		} | null;
		outgoingTransitions: Array<{
			id: string;
			fromStepId: string;
			toStepId: string;
			condition: Prisma.JsonValue;
			priority: number;
		}>;
	}>;
}): WorkflowSnapshot {
	const steps: WorkflowSnapshotStep[] = workflow.steps.map(s => ({
		id: s.id,
		type: s.type,
		name: s.name,
		config: s.config,
		templateId: s.templateId,
		template: s.template
			? {
					id: s.template.id,
					subject: s.template.subject,
					body: s.template.body,
					from: s.template.from,
					fromName: s.template.fromName,
					replyTo: s.template.replyTo,
				}
			: null,
	}));

	const transitions: WorkflowSnapshotTransition[] = workflow.steps.flatMap(s =>
		s.outgoingTransitions.map(t => ({
			id: t.id,
			fromStepId: t.fromStepId,
			toStepId: t.toStepId,
			condition: t.condition,
			priority: t.priority,
		})),
	);

	return {
		version: 1,
		workflowId: workflow.id,
		name: workflow.name,
		triggerType: workflow.triggerType,
		triggerConfig: workflow.triggerConfig,
		steps,
		transitions,
	};
}

/**
 * Resolve a workflow graph from either a snapshot or live DB data.
 * Returns a normalized structure the execution engine can work with uniformly.
 */
export function resolveWorkflowGraph(
	workflowSnapshot: Prisma.JsonValue | null | undefined,
	liveWorkflow?: {
		steps: Array<{
			id: string;
			type: string;
			name: string;
			config: Prisma.JsonValue;
			templateId: string | null;
			template?: {
				id: string;
				subject: string;
				body: string;
				from: string;
				fromName: string | null;
				replyTo: string | null;
			} | null;
			outgoingTransitions: Array<{
				id: string;
				fromStepId: string;
				toStepId: string;
				condition: Prisma.JsonValue;
				priority: number;
			}>;
		}>;
	},
): ResolvedWorkflowGraph {
	if (workflowSnapshot) {
		const snapshot = workflowSnapshot as unknown as WorkflowSnapshot;
		return {
			steps: snapshot.steps,
			transitions: snapshot.transitions,
		};
	}

	// Legacy fallback: build from live DB data
	if (!liveWorkflow) {
		return {steps: [], transitions: []};
	}

	return {
		steps: liveWorkflow.steps.map(s => ({
			id: s.id,
			type: s.type,
			name: s.name,
			config: s.config,
			templateId: s.templateId,
			template: s.template
				? {
						id: s.template.id,
						subject: s.template.subject,
						body: s.template.body,
						from: s.template.from,
						fromName: s.template.fromName,
						replyTo: s.template.replyTo,
					}
				: null,
		})),
		transitions: liveWorkflow.steps.flatMap(s =>
			s.outgoingTransitions.map(t => ({
				id: t.id,
				fromStepId: t.fromStepId,
				toStepId: t.toStepId,
				condition: t.condition,
				priority: t.priority,
			})),
		),
	};
}
