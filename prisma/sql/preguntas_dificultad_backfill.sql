DO $$
DECLARE
  q RECORD;
BEGIN
  FOR q IN SELECT "id" FROM "preguntas"
  LOOP
    PERFORM public.recalcular_dificultad_pregunta(q."id");
  END LOOP;
END $$;

