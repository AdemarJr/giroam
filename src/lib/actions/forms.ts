"use server";

import {
  createSeasonAction,
  createStageAction,
  createTeamAction,
  createTournamentAction,
  correctResultAction,
  registerForTournamentAction,
} from "./championships";
import { redirect } from "next/navigation";
import { loginAction, registerAction } from "./auth";
import {
  createAthleteByCaptainAction,
  createCaptainAction,
  createParticipantInviteAction,
  revokeInviteAction,
} from "./invites";
import {
  changePasswordAction,
  updateProfileAction,
} from "./profile";
import {
  removeTeamMemberAction,
  requestJoinTeamAction,
  resolveJoinRequestAction,
} from "./teams";

async function ignoreResult(result: unknown) {
  if (result && typeof result === "object" && "error" in result && (result as { error?: string }).error) {
    throw new Error(String((result as { error?: string }).error));
  }
}

function redirectWithError(path: string, error: string, extra?: Record<string, string>) {
  const url = new URL(path, "http://local");
  url.searchParams.set("error", error);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  }
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

export async function loginFormAction(formData: FormData): Promise<void> {
  const result = await loginAction(formData);
  if (result?.error) {
    redirectWithError("/login", result.error);
  }
}

export async function registerFormAction(formData: FormData): Promise<void> {
  const token = String(formData.get("inviteToken") ?? "");
  const result = await registerAction(formData);
  if (result?.error) {
    redirectWithError("/cadastro", result.error, token ? { token } : undefined);
  }
}

export async function createCaptainFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await createCaptainAction(formData));
}

export async function createParticipantInviteFormAction(
  formData: FormData,
): Promise<void> {
  await ignoreResult(await createParticipantInviteAction(formData));
}

export async function createAthleteByCaptainFormAction(
  formData: FormData,
): Promise<void> {
  await ignoreResult(await createAthleteByCaptainAction(formData));
}

export async function revokeInviteFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await revokeInviteAction(formData));
}

export async function createSeasonFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await createSeasonAction(formData));
}

export async function createTournamentFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await createTournamentAction(formData));
}

export async function createStageFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await createStageAction(formData));
}

export async function createTeamFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await createTeamAction(formData));
}

export async function registerTournamentFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await registerForTournamentAction(formData));
}

export async function correctResultFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await correctResultAction(formData));
}

export async function updateProfileFormAction(formData: FormData): Promise<void> {
  const result = await updateProfileAction(formData);
  if (result?.error) redirectWithError("/me", result.error);
  redirect("/me?ok=perfil");
}

export async function changePasswordFormAction(formData: FormData): Promise<void> {
  const result = await changePasswordAction(formData);
  if (result?.error) redirectWithError("/me", result.error);
  redirect("/me?ok=senha");
}

export async function requestJoinTeamFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await requestJoinTeamAction(formData));
}

export async function resolveJoinRequestFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await resolveJoinRequestAction(formData));
}

export async function removeTeamMemberFormAction(formData: FormData): Promise<void> {
  await ignoreResult(await removeTeamMemberAction(formData));
}
