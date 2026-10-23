-- Performans (Supabase danışmanı): RLS kurallarında auth.uid() satır başına değil sorgu başına bir kez
-- hesaplanır ((select auth.uid())). Kuralların anlamı değişmez. Ayrıca yabancı anahtar indeksleri.
alter policy family_invites_owner_insert on public.family_invites with check (((created_by = (select auth.uid())) AND is_family_owner(group_id)));
alter policy family_members_leave_or_remove on public.family_members using (((user_id = (select auth.uid())) OR is_family_owner(group_id)));
alter policy family_members_self_update on public.family_members using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
alter policy feedback_insert_own on public.feedback with check ((user_id = (select auth.uid())));
alter policy moderation_reports_insert_own on public.moderation_reports with check ((reporter_id = (select auth.uid())));
alter policy moderation_reports_own_select on public.moderation_reports using ((reporter_id = (select auth.uid())));
alter policy notification_preferences_own on public.notification_preferences using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
alter policy profiles_self_insert on public.profiles with check ((id = (select auth.uid())));
alter policy profiles_self_select on public.profiles using ((id = (select auth.uid())));
alter policy profiles_self_update on public.profiles using ((id = (select auth.uid()))) with check ((id = (select auth.uid())));
alter policy push_tokens_own on public.push_tokens using ((user_id = (select auth.uid()))) with check ((user_id = (select auth.uid())));
alter policy report_media_insert_own on public.report_media with check (((author_id = (select auth.uid())) AND (storage_path ~~ (((select auth.uid()))::text || '/%'::text)) AND is_report_author(report_id) AND (report_media_count(report_id) < 3)));
alter policy report_reactions_own_delete on public.report_reactions using ((user_id = (select auth.uid())));
alter policy report_reactions_own_insert on public.report_reactions with check ((user_id = (select auth.uid())));
alter policy report_reactions_own_select on public.report_reactions using ((user_id = (select auth.uid())));
alter policy report_votes_own_insert on public.report_votes with check ((voter_id = (select auth.uid())));
alter policy report_votes_own_select on public.report_votes using ((voter_id = (select auth.uid())));
alter policy safety_checkins_member_insert on public.safety_checkins with check (((user_id = (select auth.uid())) AND is_family_member(group_id)));
alter policy user_reports_delete_own on public.user_reports using ((author_id = (select auth.uid())));
alter policy user_reports_insert_own on public.user_reports with check ((author_id = (select auth.uid())));

create index if not exists family_groups_created_by_idx on public.family_groups (created_by);
create index if not exists family_invites_created_by_idx on public.family_invites (created_by);
create index if not exists family_invites_group_id_idx on public.family_invites (group_id);
create index if not exists family_invites_used_by_idx on public.family_invites (used_by);
create index if not exists family_members_user_id_idx on public.family_members (user_id);
create index if not exists feedback_user_id_idx on public.feedback (user_id);
create index if not exists moderation_reports_reporter_id_idx on public.moderation_reports (reporter_id);
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
create index if not exists report_media_author_id_idx on public.report_media (author_id);
create index if not exists report_media_report_id_idx on public.report_media (report_id);
create index if not exists report_reactions_user_id_idx on public.report_reactions (user_id);
create index if not exists report_votes_voter_id_idx on public.report_votes (voter_id);
create index if not exists safety_checkins_user_id_idx on public.safety_checkins (user_id);
