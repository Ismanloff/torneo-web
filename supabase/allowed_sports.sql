update public.categories
set is_active = case
  when lower(translate(sport, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) in ('baloncesto', 'futbol', 'voleibol')
    then true
  else false
end,
updated_at = now()
where is_active is distinct from case
  when lower(translate(sport, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) in ('baloncesto', 'futbol', 'voleibol')
    then true
  else false
end;
