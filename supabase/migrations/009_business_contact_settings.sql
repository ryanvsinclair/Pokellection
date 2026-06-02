-- Default business contact + e-transfer email for Pokellection.

update public.site_settings
set
  contact_email = 'hello@pokellection.com',
  etransfer_email = 'hello@pokellection.com',
  etransfer_instructions = 'Include your order number in the e-transfer memo.'
where id = 1;
