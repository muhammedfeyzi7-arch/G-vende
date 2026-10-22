import { requireSupabase } from '@/services/supabase';
import type { LatLng } from '@/utils/geo';

export type CheckinStatus = 'safe' | 'need_help';

export interface FamilyMember {
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
  shareLocation: boolean;
  lastCheckin: { status: CheckinStatus; note: string | null; at: string; location: LatLng | null } | null;
}

export interface FamilyGroup {
  id: string;
  name: string;
  meetingPoint: { name: string; latitude: number | null; longitude: number | null } | null;
  members: FamilyMember[];
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await requireSupabase().auth.getSession();
  return data.session?.user.id ?? null;
}

export async function fetchGroups(): Promise<FamilyGroup[]> {
  const sb = requireSupabase();
  const { data: groups, error } = await sb
    .from('family_groups')
    .select('id, name, meeting_point_name, meeting_point_lat, meeting_point_lon, family_members(user_id, display_name, role, share_location)')
    .order('created_at');
  if (error) throw error;
  const ids = (groups ?? []).map((g) => g.id as string);
  if (!ids.length) return [];
  // Her üyenin son durumu (son 7 gün)
  const { data: checkins, error: cErr } = await sb
    .from('safety_checkins')
    .select('group_id, user_id, status, note, latitude, longitude, created_at')
    .in('group_id', ids)
    .gte('created_at', new Date(Date.now() - 7 * 86400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(500);
  if (cErr) throw cErr;

  return (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    meetingPoint: g.meeting_point_name ? { name: g.meeting_point_name, latitude: g.meeting_point_lat, longitude: g.meeting_point_lon } : null,
    members: ((g.family_members ?? []) as { user_id: string; display_name: string; role: 'owner' | 'member'; share_location: boolean }[]).map((m) => {
      const c = checkins?.find((x) => x.group_id === g.id && x.user_id === m.user_id);
      return {
        userId: m.user_id,
        displayName: m.display_name,
        role: m.role,
        shareLocation: m.share_location,
        lastCheckin: c
          ? {
              status: c.status as CheckinStatus,
              note: c.note,
              at: c.created_at,
              location: c.latitude != null && c.longitude != null ? { latitude: c.latitude, longitude: c.longitude } : null,
            }
          : null,
      };
    }),
  }));
}

export async function createGroup(name: string, displayName: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('create_family_group', { p_name: name, p_display_name: displayName });
  if (error) throw error;
  return data as string;
}

export async function createInvite(groupId: string): Promise<{ token: string; expiresAt: string }> {
  const { data, error } = await requireSupabase().from('family_invites').insert({ group_id: groupId }).select('token, expires_at').single();
  if (error) throw error;
  return { token: data.token, expiresAt: data.expires_at };
}

export async function acceptInvite(token: string, displayName: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('accept_family_invite', { p_token: token, p_display_name: displayName });
  if (error) throw error;
  return data as string;
}

export async function checkin(groupIds: string[], status: CheckinStatus, note: string | null, location: LatLng | null) {
  const sb = requireSupabase();
  const uid = await currentUserId();
  if (!uid) throw new Error('auth_required');
  // Konum yalnızca üye paylaşımı açtıysa sunucuda saklanır (tetikleyici aksi halde siler).
  const rows = groupIds.map((group_id) => ({
    group_id,
    user_id: uid,
    status,
    note,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
  }));
  const { error } = await sb.from('safety_checkins').insert(rows);
  if (error) throw error;
}

export async function setShareLocation(groupId: string, share: boolean) {
  const uid = await currentUserId();
  const { error } = await requireSupabase().from('family_members').update({ share_location: share }).eq('group_id', groupId).eq('user_id', uid!);
  if (error) throw error;
}

export async function setMeetingPoint(groupId: string, name: string | null, at: LatLng | null) {
  const { error } = await requireSupabase()
    .from('family_groups')
    .update({ meeting_point_name: name, meeting_point_lat: at?.latitude ?? null, meeting_point_lon: at?.longitude ?? null })
    .eq('id', groupId);
  if (error) throw error;
}

export async function leaveGroup(groupId: string) {
  const uid = await currentUserId();
  const { error } = await requireSupabase().from('family_members').delete().eq('group_id', groupId).eq('user_id', uid!);
  if (error) throw error;
}

export const inviteLink = (token: string) => `guvende://aile/davet/${token}`;
