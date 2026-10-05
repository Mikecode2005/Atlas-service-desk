"use server";

import { revalidatePath } from "next/cache";
import { currentTime } from "@/lib/clock";
import { prisma } from "@/lib/db";
import { resetDemo } from "@/lib/demo";
import { fromInputValue } from "@/lib/format";
import * as service from "@/lib/service";
import type { Priority } from "@/lib/triage";
import type { Status } from "@/lib/view";
import type { BoardData } from "@/lib/view";
import type { ActionResult } from "./action-types";

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    revalidatePath("/");
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
  }
}

export async function createRequestAction(input: { customerId: string; channel: string; message: string; receivedAt?: string }) {
  return run(async () => {
    const agg = await prisma.requestEvent.aggregate({ _max: { createdAt: true } });
    const receivedAt = input.receivedAt ? fromInputValue(input.receivedAt) : currentTime(agg._max.createdAt);
    return service.createRequest(prisma, { customerId: input.customerId, channel: input.channel, message: input.message, receivedAt });
  });
}

export async function assignAction(id: string, technicianId: string) {
  return run(() => service.assignTechnician(prisma, id, technicianId));
}

export async function scheduleAction(id: string, visitAt: string) {
  return run(() => service.scheduleVisit(prisma, id, fromInputValue(visitAt)));
}

export async function statusAction(id: string, status: Status) {
  return run(() => service.setStatus(prisma, id, status));
}

export async function infoReceivedAction(id: string) {
  return run(() => service.markInfoReceived(prisma, id));
}

export async function priorityAction(id: string, priority: Priority) {
  return run(() => service.changePriority(prisma, id, priority));
}

export async function linkAction(id: string) {
  return run(() => service.linkDuplicate(prisma, id));
}

export async function keepSeparateAction(id: string) {
  return run(() => service.keepSeparate(prisma, id));
}

export async function customerUpdateAction(id: string) {
  return run(() => service.prepareCustomerUpdate(prisma, id));
}

export async function myRequestsAction(technicianId: string): Promise<ActionResult<BoardData>> {
  return run(async () => {
    const board = await service.loadBoard(prisma);
    const filteredRequests = board.requests.filter(
      (r) => r.technicianId === technicianId && r.status !== "CLOSED" && !r.duplicateOfId
    );
    return {
      ...board,
      requests: filteredRequests,
    };
  });
}

export async function resetAction() {
  return run(() => resetDemo(prisma));
}
