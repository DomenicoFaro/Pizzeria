-- =====================================================================
-- RistOro dell'Etna — dati iniziali (seed)
-- ATTENZIONE: prezzi, ingredienti e allergeni segnati [DA CONFERMARE] nel PRD
-- sono segnaposto e vanno verificati dal ristorante (modificabili da /admin).
-- =====================================================================

-- ---------- Orari (0 = domenica) ----------
delete from public.opening_hours;
insert into public.opening_hours (weekday, open_time, close_time) values
  (1, '19:30', '00:00'),
  (3, '19:30', '00:00'),
  (4, '19:30', '00:00'),
  (5, '19:30', '00:00'),
  (6, '19:30', '00:00'),
  (0, '12:30', '15:00'),
  (0, '19:30', '23:30');

-- ---------- Zone di consegna [DA CONFERMARE] ----------
delete from public.delivery_zones;
insert into public.delivery_zones (name, description, radius_km, fee, min_order, free_over, position) values
  ('Zona 1', 'Nicolosi',                                       2.5,  2.00, 15, 40, 1),
  ('Zona 2', 'Pedara, Mascalucia, Belpasso, Ragalna',          9.5,  3.50, 20, 50, 2),
  ('Zona 3', 'Gravina, Tremestieri, San Pietro Clarenza',     14.0,  5.00, 25, null, 3);

-- ---------- Categorie ----------
insert into public.categories (name, slug, description, position, counts_for_capacity) values
  ('Pizze classiche', 'pizze-classiche', 'Impasto alto e soffice, cornicione a nido d''ape, cotte nel forno a legna.', 1, true),
  ('Pizze speciali',  'pizze-speciali',  'Le nostre creazioni, con i sapori dell''Etna.', 2, true),
  ('Antipasti',       'antipasti',       null, 3, false),
  ('Insalate',        'insalate',        null, 4, false),
  ('Primi',           'primi',           'Pasta fresca e sughi della tradizione.', 5, false),
  ('Dalla brace',     'dalla-brace',     'Tagli scelti cotti sulla nostra brace.', 6, false),
  ('Dolci',           'dolci',           'Fatti in casa.', 7, false),
  ('Bevande',         'bevande',         null, 8, false)
on conflict (slug) do nothing;

-- helper: inserisce un prodotto nella categoria indicata dallo slug
create or replace function pg_temp.p(
  cat text, pname text, pdesc text, pprice numeric, pallergens text[], ptags text[],
  ppos int, pfeatured boolean default false
) returns void language sql as $$
  insert into public.products (category_id, name, description, price, allergens, tags, position, is_featured)
  select id, pname, pdesc, pprice, pallergens, ptags, ppos, pfeatured from public.categories where slug = cat;
$$;

-- ---------- Pizze classiche ----------
select pg_temp.p('pizze-classiche', 'La Pizzaiola',      'salsa di pomodoro, olio EVO, origano',                                  6.00, '{glutine}',       '{vegano}', 1);
select pg_temp.p('pizze-classiche', 'La Biancaneve',     'mozzarella fiordilatte, olio EVO, origano',                             7.00, '{glutine,latte}', '{vegetariano}', 2);
select pg_temp.p('pizze-classiche', 'La Margherita',     'pelato di pomodoro, mozzarella di bufala, olio EVO, basilico',          8.00, '{glutine,latte}', '{vegetariano,consigliato}', 3);
select pg_temp.p('pizze-classiche', 'La Margherita 2.0', 'pelato San Marzano, pecorino, fiordilatte, olio EVO, basilico',        10.00, '{glutine,latte}', '{vegetariano}', 4);
select pg_temp.p('pizze-classiche', 'La Verace',         'salsa di pomodoro, mozzarella di bufala, olio EVO, basilico',          10.00, '{glutine,latte}', '{vegetariano}', 5);

-- ---------- Pizze speciali [DA CONFERMARE ingredienti e prezzi] ----------
select pg_temp.p('pizze-speciali', 'La Ristoro dell''Etna', 'fiordilatte, crema di pistacchio, mortadella, burrata, granella di pistacchio di Bronte', 14.00, '{glutine,latte,frutta_guscio}', '{consigliato}', 1, true);
select pg_temp.p('pizze-speciali', 'Pizza al pistacchio',   'fiordilatte, pesto di pistacchio, salsiccia, granella di pistacchio',                     13.00, '{glutine,latte,frutta_guscio}', '{consigliato}', 2, true);
select pg_temp.p('pizze-speciali', 'La Capricciosa',        'salsa di pomodoro, fiordilatte, prosciutto cotto, funghi, carciofi, olive',               11.00, '{glutine,latte}', '{}', 3);
select pg_temp.p('pizze-speciali', 'La Norma',              'salsa di pomodoro, fiordilatte, melanzane fritte, ricotta salata, basilico',              10.00, '{glutine,latte}', '{vegetariano}', 4, true);
select pg_temp.p('pizze-speciali', 'L''Americana',          'salsa di pomodoro, fiordilatte, wurstel, patatine fritte',                                10.00, '{glutine,latte}', '{}', 5);
select pg_temp.p('pizze-speciali', 'La Marinara 2.0',       'pomodorini, aglio, origano, acciughe, olio EVO',                                          10.00, '{glutine,pesce}', '{}', 6);
select pg_temp.p('pizze-speciali', 'La Tonnara',            'salsa di pomodoro, fiordilatte, tonno, cipolla rossa',                                    10.00, '{glutine,latte,pesce}', '{}', 7);
select pg_temp.p('pizze-speciali', 'La Quattro Formaggi',   'fiordilatte, gorgonzola, provola, grana',                                                 11.00, '{glutine,latte}', '{vegetariano}', 8);
select pg_temp.p('pizze-speciali', 'La Parmigiana',         'salsa di pomodoro, fiordilatte, melanzane fritte, prosciutto cotto, grana',               11.00, '{glutine,latte}', '{}', 9);
select pg_temp.p('pizze-speciali', 'La Verde Oro',          'fiordilatte, pesto di basilico, pomodorini gialli, stracciatella',                        12.00, '{glutine,latte,frutta_guscio}', '{vegetariano,novita}', 10);
select pg_temp.p('pizze-speciali', 'La Crispy',             'fiordilatte, pancetta croccante, cipolla caramellata, scaglie di grana',                  12.00, '{glutine,latte}', '{}', 11);
select pg_temp.p('pizze-speciali', 'La Vegetariana',        'salsa di pomodoro, fiordilatte, verdure grigliate di stagione',                           11.00, '{glutine,latte}', '{vegetariano}', 12);
select pg_temp.p('pizze-speciali', 'La Siciliana',          'salsa di pomodoro, acciughe, olive nere, capperi, pecorino, origano',                     11.00, '{glutine,latte,pesce}', '{}', 13);
select pg_temp.p('pizze-speciali', 'La Valtellina',         'fiordilatte, bresaola, rucola, scaglie di grana',                                         13.00, '{glutine,latte}', '{}', 14);
select pg_temp.p('pizze-speciali', 'La Spagnola',           'salsa di pomodoro, fiordilatte, salame piccante, peperoni, cipolla',                      12.00, '{glutine,latte}', '{piccante}', 15);
select pg_temp.p('pizze-speciali', 'La Fattoressa',         'fiordilatte, salsiccia, funghi, patate al forno',                                         12.00, '{glutine,latte}', '{}', 16);
select pg_temp.p('pizze-speciali', 'Calzone',               'ripieno di ricotta, fiordilatte, prosciutto cotto, salsa di pomodoro',                     9.00, '{glutine,latte}', '{}', 17);

-- ---------- Antipasti ----------
select pg_temp.p('antipasti', 'Bruschette miste',                    'pane casereccio, pomodoro, olio EVO, basilico e varianti del giorno [prezzo da confermare]', 7.00, '{glutine}', '{vegetariano,consigliato}', 1);
select pg_temp.p('antipasti', 'Carpaccio di manzo',                  'rucola, scaglie di grana, olio EVO, limone',               13.00, '{latte}', '{}', 2);
select pg_temp.p('antipasti', 'Delizia di funghi di stagione',       'funghi dell''Etna saltati, aglio, prezzemolo',              13.00, '{}', '{vegano}', 3);
select pg_temp.p('antipasti', 'Verdure grigliate',                   'verdure di stagione alla brace, olio EVO',                  14.00, '{}', '{vegano}', 4);
select pg_temp.p('antipasti', 'Composizione rustica dello chef',     'salumi, formaggi e sfizi della casa',                       15.00, '{glutine,latte}', '{}', 5);
select pg_temp.p('antipasti', 'Composè di prosciutto crudo di Parma','prosciutto crudo di Parma, mozzarella di bufala',           16.00, '{latte}', '{}', 6);

-- ---------- Insalate ----------
select pg_temp.p('insalate', 'Caesar salad',      'pollo, iceberg, crostini, salsa allo yogurt',              12.00, '{glutine,latte,uova}', '{}', 1);
select pg_temp.p('insalate', 'Insalata caprese',  'mozzarella di bufala, pomodoro, basilico, olio EVO',       12.50, '{latte}', '{vegetariano}', 2);

-- ---------- Primi ----------
select pg_temp.p('primi', 'Tonnarello alla Norma',  'melanzane, ricotta salata',                       11.00, '{glutine,latte,uova}', '{vegetariano}', 1);
select pg_temp.p('primi', 'Gnocchi ai 4 formaggi',  'speck, noci',                                     11.00, '{glutine,latte,frutta_guscio}', '{}', 2);
select pg_temp.p('primi', 'Pacchero rosso',         'pasta fresca, ragù di manzo, noci',               13.00, '{glutine,uova,frutta_guscio,sedano}', '{consigliato}', 3);
select pg_temp.p('primi', 'Rigatone',               'condimento del giorno [da confermare]',           13.00, '{glutine}', '{}', 4);
select pg_temp.p('primi', 'Ravioli',                'ripieni di carne e pistacchio, crema di porcini', 14.00, '{glutine,latte,uova,frutta_guscio}', '{}', 5);

-- ---------- Dalla brace ----------
select pg_temp.p('dalla-brace', 'Costine di maiale',              'cotte lentamente, si staccano dall''osso',                    18.00, '{}', '{consigliato}', 1, true);
select pg_temp.p('dalla-brace', 'Misto di carne alla griglia',    'selezione di tagli della casa alla brace',                    20.00, '{}', '{consigliato}', 2, true);
select pg_temp.p('dalla-brace', 'Filetto al brandy',              'filetto di manzo, salsa al brandy',                           25.00, '{latte,solfiti}', '{}', 3);
select pg_temp.p('dalla-brace', 'Filetto ai funghi porcini',      'filetto di manzo, porcini',                                   28.00, '{latte}', '{}', 4);
select pg_temp.p('dalla-brace', 'Gigant ribs di vitello',         'costate di vitello alla brace',                               28.00, '{}', '{novita}', 5);
select pg_temp.p('dalla-brace', 'Carne di cavallo alla catanese', 'fettine di cavallo alla brace [prezzo da confermare]',        16.00, '{}', '{}', 6);
select pg_temp.p('dalla-brace', 'Agnello di montagna',            'agnello alla brace [prezzo da confermare]',                   18.00, '{}', '{}', 7);

-- ---------- Dolci [DA CONFERMARE] ----------
select pg_temp.p('dolci', 'Cannolo siciliano',     'ricotta di pecora, gocce di cioccolato, granella di pistacchio', 4.50, '{glutine,latte,frutta_guscio}', '{vegetariano}', 1);
select pg_temp.p('dolci', 'Tiramisù della casa',   'savoiardi, mascarpone, caffè, cacao',                            5.00, '{glutine,latte,uova}', '{vegetariano}', 2);
select pg_temp.p('dolci', 'Semifreddo al pistacchio', null,                                                          5.00, '{latte,uova,frutta_guscio}', '{vegetariano}', 3);

-- ---------- Bevande [DA CONFERMARE] ----------
select pg_temp.p('bevande', 'Acqua naturale 1L',          null, 2.00, '{}', '{}', 1);
select pg_temp.p('bevande', 'Acqua frizzante 1L',         null, 2.00, '{}', '{}', 2);
select pg_temp.p('bevande', 'Coca-Cola 33cl',             null, 3.00, '{}', '{}', 3);
select pg_temp.p('bevande', 'Aranciata siciliana 33cl',   null, 3.00, '{}', '{}', 4);
select pg_temp.p('bevande', 'Birra Messina 33cl',         null, 3.50, '{glutine}', '{}', 5);
select pg_temp.p('bevande', 'Birra artigianale 50cl',     null, 6.00, '{glutine}', '{}', 6);
select pg_temp.p('bevande', 'Etna Rosso DOC (bottiglia)', null, 22.00, '{solfiti}', '{}', 7);
select pg_temp.p('bevande', 'Etna Bianco DOC (bottiglia)',null, 22.00, '{solfiti}', '{}', 8);
select pg_temp.p('bevande', 'Amaro siciliano',            null, 3.50, '{}', '{}', 9);

-- ---------- Personalizzazioni ----------
insert into public.modifier_groups (name, type, required, min, max, position) values
  ('Impasto',             'single',   true,  1, 1, 1),
  ('Formato',             'single',   true,  1, 1, 2),
  ('Aggiungi ingredienti','multiple', false, 0, 8, 3),
  ('Cottura',             'single',   true,  1, 1, 4);

insert into public.modifiers (group_id, name, price_delta, is_default, is_available, position)
select g.id, m.name, m.delta, m.is_default, m.avail, m.pos
from public.modifier_groups g
join (values
  ('Impasto', 'Classico',               0.00, true,  true,  1),
  ('Impasto', 'Integrale',              1.50, false, true,  2),
  ('Impasto', 'Senza glutine',          3.00, false, false, 3),
  ('Formato', 'Normale',                0.00, true,  true,  1),
  ('Formato', 'Gigante',                5.00, false, false, 2),
  ('Aggiungi ingredienti', 'Mozzarella di bufala',     2.50, false, true, 1),
  ('Aggiungi ingredienti', 'Burrata',                  3.00, false, true, 2),
  ('Aggiungi ingredienti', 'Prosciutto cotto',         1.50, false, true, 3),
  ('Aggiungi ingredienti', 'Prosciutto crudo',         2.50, false, true, 4),
  ('Aggiungi ingredienti', 'Salame piccante',          1.50, false, true, 5),
  ('Aggiungi ingredienti', 'Salsiccia',                2.00, false, true, 6),
  ('Aggiungi ingredienti', 'Speck',                    2.00, false, true, 7),
  ('Aggiungi ingredienti', 'Funghi',                   1.00, false, true, 8),
  ('Aggiungi ingredienti', 'Melanzane fritte',         1.00, false, true, 9),
  ('Aggiungi ingredienti', 'Olive nere',               1.00, false, true, 10),
  ('Aggiungi ingredienti', 'Acciughe',                 1.50, false, true, 11),
  ('Aggiungi ingredienti', 'Rucola',                   1.00, false, true, 12),
  ('Aggiungi ingredienti', 'Pomodorini',               1.00, false, true, 13),
  ('Aggiungi ingredienti', 'Ricotta',                  1.50, false, true, 14),
  ('Aggiungi ingredienti', 'Granella di pistacchio',   2.50, false, true, 15),
  ('Aggiungi ingredienti', 'Patatine fritte',          1.50, false, true, 16),
  ('Cottura', 'Al sangue',     0.00, false, true, 1),
  ('Cottura', 'Media',         0.00, true,  true, 2),
  ('Cottura', 'Ben cotta',     0.00, false, true, 3)
) as m(grp, name, delta, is_default, avail, pos) on m.grp = g.name;

-- Tutte le pizze: impasto, formato, aggiunte
insert into public.product_modifier_groups (product_id, group_id)
select p.id, g.id
from public.products p
join public.categories c on c.id = p.category_id and c.slug in ('pizze-classiche', 'pizze-speciali')
cross join public.modifier_groups g
where g.name in ('Impasto', 'Formato', 'Aggiungi ingredienti')
on conflict do nothing;

-- Filetti: cottura
insert into public.product_modifier_groups (product_id, group_id)
select p.id, g.id
from public.products p
cross join public.modifier_groups g
where p.name like 'Filetto%' and g.name = 'Cottura'
on conflict do nothing;

-- ---------- Codice sconto di esempio ----------
insert into public.discount_codes (code, type, value, min_order, max_uses)
values ('BENVENUTO10', 'percent', 10, 20, 500)
on conflict do nothing;
