ALTER TABLE "user_invites" ADD COLUMN IF NOT EXISTS "team_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
