-- Güvenlik sertleştirme (Supabase güvenlik denetimi önerisi):
-- Tetikleyici fonksiyonları ve iç yardımcılar API üzerinden (/rest/v1/rpc) çağrılamasın.
-- Tetikleyiciler EXECUTE yetkisi olmadan da çalışır. RLS politikalarında kullanılan yardımcılar
-- yalnızca gereken role açık bırakılır.

-- Tetikleyici fonksiyonları: hiçbir istemci rolü doğrudan çağıramaz
revoke execute on function
  public.user_reports_before_insert(),
  public.report_reactions_count(),
  public.moderation_reports_after_insert(),
  public.safety_checkins_before_insert(),
  public.feedback_before_insert(),
  public.report_media_before_insert(),
  public.report_media_after_insert(),
  public.report_votes_before_insert(),
  public.report_votes_after_insert()
from public, anon, authenticated;

-- Başka kullanıcıların rolünü/durumunu sorgulamaya yarayabilecek iç yardımcılar (yalnızca tanımlayıcı tetikleyiciler kullanır)
revoke execute on function public.user_role(uuid), public.is_identity_verified(uuid), public.is_suspended(uuid)
from public, anon, authenticated;

-- Yalnızca girişli kullanıcıların politikalarında kullanılanlar
revoke execute on function public.is_report_author(uuid), public.report_media_count(uuid), public.is_own_pending(uuid), public.my_trust()
from public, anon;
grant execute on function public.is_report_author(uuid), public.report_media_count(uuid), public.is_own_pending(uuid), public.my_trust()
to authenticated;

-- Anonim okuma politikalarında gerekenler (görünür bildirim/fotoğraf kontrolü) açık kalır:
-- public.report_is_visible(uuid), public.media_path_visible(text)

-- Uzaklık hesabı: sabit arama yolu
alter function public.distance_m(double precision, double precision, double precision, double precision) set search_path = public;
