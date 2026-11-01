-- BrewHub migration 001: allowed e-mail domains per company
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Employees may register with @gmail.com or with one of these domains.

alter table companies
  add column if not exists email_domains text not null default '';

-- Example (change to the real domains):
-- update companies set email_domains = 'th-deg.de, stud.th-deg.de' where name = 'THD';
-- update companies set email_domains = 'zollner.de' where name = 'Zollner';
-- update companies set email_domains = 'rohde-schwarz.com' where name = 'Rohde & Schwarz';
