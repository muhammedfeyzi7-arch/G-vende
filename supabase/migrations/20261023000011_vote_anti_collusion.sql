-- Koordineli sahte hesaplara karşı ek önlemler (topluluk onayı = 3 kişi):
--  1) Kimliği 24 saatten kısa süre önce doğrulanmış hesaplar oy veremez (yeni açılan hesap çiftlikleri hemen oylayamaz).
--  2) Bir kişi aynı yazarın bildirimlerinden 24 saatte en fazla 3'ünü onaylayabilir (karşılıklı "onay halkası" sınırı).
-- Mevcut kurallar (oy başına tek kişi, 500 m, saatte 30 oy, kimlik başına tek hesap, ihlal/askı) aynen geçerlidir.
create or replace function public.report_votes_anti_collusion() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  verified_at timestamptz;
  author uuid;
  same_author int;
begin
  if uid is null or public.user_role(uid) <> 'user' then
    return new; -- kimlik/rol kontrolleri report_votes_before_insert'te
  end if;
  select identity_verified_at into verified_at from public.profiles where id = uid;
  if verified_at is not null and verified_at > now() - interval '24 hours' then
    raise exception 'identity_too_new' using errcode = 'P0001', hint = 'Kimlik doğrulamasından 24 saat sonra oy verebilirsiniz.';
  end if;
  if new.vote = 'confirm' then
    select author_id into author from public.user_reports where id = new.report_id;
    select count(*) into same_author
      from public.report_votes v join public.user_reports r on r.id = v.report_id
     where v.voter_id = uid and v.vote = 'confirm' and r.author_id = author and v.created_at > now() - interval '24 hours';
    if same_author >= 3 then
      raise exception 'collusion_limit' using errcode = 'P0001', hint = 'Aynı kişinin bildirimlerini 24 saatte en fazla 3 kez onaylayabilirsiniz.';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.report_votes_anti_collusion() from public, anon, authenticated;
drop trigger if exists report_votes_anti_collusion on public.report_votes;
create trigger report_votes_anti_collusion before insert on public.report_votes
  for each row execute function public.report_votes_anti_collusion();
