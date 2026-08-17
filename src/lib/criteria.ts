import { prisma } from "@/lib/db";

export const CRITERIA_TARGETS = {
  chairProjects: 1,
  coreProjects: 1,
  hodProjects: 3,
  installations: 10,
  ocvs: 8,
};

export async function getAllCriteriaData() {
  const [installations, ocvs, projects] = await Promise.all([
    prisma.installation.findMany({ orderBy: { date: "desc" } }),
    prisma.ocv.findMany({ orderBy: { date: "desc" } }),
    prisma.project.findMany({ orderBy: { date: "desc" } }),
  ]);
  return { installations, ocvs, projects };
}

export function computeDcmProgress(
  dcmId: string,
  data: Awaited<ReturnType<typeof getAllCriteriaData>>
) {
  const installationsAttended = data.installations.filter((r) => r.attendeeDcmIds.includes(dcmId)).length;
  const ocvsAttended = data.ocvs.filter((r) => r.attendeeDcmIds.includes(dcmId)).length;
  const chairCount = data.projects.filter((p) => p.chairDcmIds.includes(dcmId)).length;
  const coreCount = data.projects.filter((p) => p.coreDcmIds.includes(dcmId)).length;
  const hodCount = data.projects.filter((p) => p.hodDcmIds.includes(dcmId)).length;

  return {
    installations: { done: installationsAttended, target: CRITERIA_TARGETS.installations },
    ocvs: { done: ocvsAttended, target: CRITERIA_TARGETS.ocvs },
    chairProjects: { done: chairCount, target: CRITERIA_TARGETS.chairProjects },
    coreProjects: { done: coreCount, target: CRITERIA_TARGETS.coreProjects },
    hodProjects: { done: hodCount, target: CRITERIA_TARGETS.hodProjects },
  };
}
