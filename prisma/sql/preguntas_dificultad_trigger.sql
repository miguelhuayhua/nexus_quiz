CREATE OR REPLACE FUNCTION public.recalcular_dificultad_pregunta(p_pregunta_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_pregunta_id IS NULL OR p_pregunta_id = '' THEN
    RETURN;
  END IF;

  WITH agg AS (
    SELECT
      COUNT(*) FILTER (WHERE "resultado" IN ('BIEN', 'MAL'))::int AS total_respondidas,
      COUNT(*) FILTER (WHERE "resultado" = 'BIEN')::int AS total_bien,
      COUNT(*) FILTER (WHERE "resultado" = 'MAL')::int AS total_mal
    FROM "respuestasIntentos"
    WHERE "preguntaId" = p_pregunta_id
  )
  UPDATE "preguntas" p
  SET
    "totalRespondidas" = agg.total_respondidas,
    "totalBien" = agg.total_bien,
    "totalMal" = agg.total_mal,
    "tasaAcierto" = CASE
      WHEN agg.total_respondidas > 0
        THEN ROUND((agg.total_bien::numeric * 100.0) / agg.total_respondidas)::int
      ELSE 0
    END,
    "dificultad" = CASE
      WHEN agg.total_respondidas = 0 THEN 'MEDIO'::"PreguntaDificultad"
      WHEN ((agg.total_bien::numeric * 100.0) / agg.total_respondidas) < 33 THEN 'DIFICIL'::"PreguntaDificultad"
      WHEN ((agg.total_bien::numeric * 100.0) / agg.total_respondidas) <= 66 THEN 'MEDIO'::"PreguntaDificultad"
      ELSE 'SENCILLO'::"PreguntaDificultad"
    END,
    "dificultadActualizadaEn" = NOW(),
    "actualizadoEn" = NOW()
  FROM agg
  WHERE p."id" = p_pregunta_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_dificultad_pregunta()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalcular_dificultad_pregunta(OLD."preguntaId");
    RETURN OLD;
  END IF;

  PERFORM public.recalcular_dificultad_pregunta(NEW."preguntaId");

  IF TG_OP = 'UPDATE' AND OLD."preguntaId" IS DISTINCT FROM NEW."preguntaId" THEN
    PERFORM public.recalcular_dificultad_pregunta(OLD."preguntaId");
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_respuestas_intentos_sync_dificultad" ON "respuestasIntentos";

CREATE TRIGGER "trg_respuestas_intentos_sync_dificultad"
AFTER INSERT OR UPDATE OR DELETE
ON "respuestasIntentos"
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_dificultad_pregunta();

