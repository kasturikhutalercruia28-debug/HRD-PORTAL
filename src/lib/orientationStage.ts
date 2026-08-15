// Pres/Sec is now a real value in the OrientationType enum, same as
// core_member, bod, and everyone. This file just maps the DB enum name to a
// consistent display label used across the app.

export type EffectiveStage = "pres_sec" | "core" | "bod" | "everyone";

interface RequestLike {
  orientationType: "pres_sec" | "core_member" | "bod" | "everyone";
}

export function getEffectiveStage(request: RequestLike): EffectiveStage {
  if (request.orientationType === "core_member") return "core";
  return request.orientationType;
}
