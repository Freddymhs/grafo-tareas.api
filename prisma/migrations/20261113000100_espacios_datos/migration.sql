INSERT INTO "tipos_conexion" ("id", "nombre", "bloquea", "contiene", "simetrica") VALUES
  (gen_random_uuid(), 'DEPENDE_DE', true, false, false),
  (gen_random_uuid(), 'ESPERA_RESPUESTA_DE', true, false, false),
  (gen_random_uuid(), 'BLOQUEADA_POR', true, false, false),
  (gen_random_uuid(), 'PERTENECE_A', false, true, false),
  (gen_random_uuid(), 'EN_DAILY_DE', false, false, false),
  (gen_random_uuid(), 'SE_RELACIONA_CON', false, false, true),
  (gen_random_uuid(), 'DERIVA_DE', false, false, false)
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "espacios" ("id", "nombre", "orden", "metodo", "etapas") VALUES
  (gen_random_uuid(), 'SIGSA', 0, 'trabajo-hu', ARRAY[
    'ENTENDIMIENTO',
    'EN CODIGO',
    'Collection Created',
    '❓ DUDAS EN ESPERA',
    'AMARRAR 🧰',
    'CAMBIAR 🧰',
    'RED 🧰',
    'TESTEADO',
    'LISTO PARA PR',
    'Pull Request',
    'APROBADO',
    'CERRADO',
    'TRÁMITES DE CIERRE',
    '🔎 Precheck fin de sprint (archivadas)'
  ])
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "proyectos" ("id", "espacio_id", "nombre", "orden")
SELECT gen_random_uuid(), e."id", p."nombre", p."orden"
FROM "espacios" e, (VALUES ('SAG', 0), ('General', 1)) AS p("nombre", "orden")
WHERE e."nombre" = 'SIGSA'
ON CONFLICT ("espacio_id", "nombre") DO NOTHING;

INSERT INTO "tipos_nodo" ("id", "espacio_id", "nombre", "tiene_ciclo", "accionable")
SELECT gen_random_uuid(), e."id", t."nombre", true, t."accionable"
FROM "espacios" e,
  (VALUES ('TAREA', true), ('HISTORIA', false), ('FASE', false), ('RAMA', false), ('DUDA', false),
          ('PERSONA', false), ('PR', false), ('DAILY_ITEM', false)) AS t("nombre", "accionable")
WHERE e."nombre" = 'SIGSA'
ON CONFLICT ("espacio_id", "nombre") DO NOTHING;

UPDATE "nodos"
SET "proyecto_id" = (
  SELECT p."id" FROM "proyectos" p JOIN "espacios" e ON e."id" = p."espacio_id"
  WHERE e."nombre" = 'SIGSA' AND p."nombre" = 'SAG'
)
WHERE "proyecto_id" IS NULL;
