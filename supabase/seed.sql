insert into public.page_seo (page_key, pathname, sitemap_priority, change_frequency)
values
  ('home', '/', 1.0, 'weekly'),
  ('calculator', '/calculator', 0.8, 'monthly'),
  ('scientific-calculator', '/scientific-calculator', 0.8, 'monthly'),
  ('age-calculator', '/age-calculator', 0.8, 'monthly'),
  ('percentage-calculator', '/percentage-calculator', 0.8, 'monthly'),
  ('loan-calculator', '/loan-calculator', 0.8, 'monthly'),
  ('date-calculator', '/date-calculator', 0.8, 'monthly'),
  ('unit-converter', '/unit-converter', 0.8, 'monthly'),
  ('currency-converter', '/currency-converter', 0.8, 'monthly'),
  ('tip-calculator', '/tip-calculator', 0.8, 'monthly'),
  ('birthday-countdown', '/birthday-countdown', 0.8, 'monthly')
on conflict (page_key) do nothing;

insert into public.site_settings (id) values (true) on conflict (id) do nothing;
