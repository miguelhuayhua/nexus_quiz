"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, ShuffleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SelectOption = { label: string; value: string };

type HierarchyTema = { id: string; titulo: string };
type HierarchyCapitulo = { id: string; titulo: string; temas: HierarchyTema[] };
type HierarchyArea = { id: string; titulo: string; capitulos: HierarchyCapitulo[] };

type FilterCatalogResponse = {
  areas: SelectOption[];
  capitulos: SelectOption[];
  temas: SelectOption[];
  gestiones: SelectOption[];
  dificultades: SelectOption[];
  hierarchy: HierarchyArea[];
};

type PreguntaItem = {
  id: string;
  codigo: string;
  pregunta: string;
  dificultad: "SENCILLO" | "MEDIO" | "DIFICIL";
  gestion: number;
  temas: string[];
  capitulos: string[];
  areas: string[];
};

async function fetchFilterCatalog(): Promise<FilterCatalogResponse | null> {
  try {
    const response = await fetch("/api/banqueo/filtros", { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as FilterCatalogResponse;
    console.log(body)
    return body;
  } catch {
    return null;
  }
}

export default function CrearBanqueoClient({ hasPro }: { hasPro: boolean }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const CONTROL_HEIGHT_CLASS = "h-9 text-sm";

  const [titulo, setTitulo] = React.useState("");
  const [duracion, setDuracion] = React.useState<number | null>(60);
  const [maxPreguntas, setMaxPreguntas] = React.useState<number | null>(20);

  const [catalog, setCatalog] = React.useState<FilterCatalogResponse | null>(null);
  const [areas, setAreas] = React.useState<string[]>([]);
  const [capitulos, setCapitulos] = React.useState<string[]>([]);
  const [temas, setTemas] = React.useState<string[]>([]);
  const [gestiones, setGestiones] = React.useState<string[]>([]);
  const [dificultades, setDificultades] = React.useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      const data = await fetchFilterCatalog();
      if (!mounted) return;

      if (!data) {
        setError("No se pudieron cargar los filtros.");
        return;
      }

      setCatalog(data);
      // All start unchecked — user picks from áreas first
    }

    void loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const hierarchy = catalog?.hierarchy ?? [];
  const allGestiones = catalog?.gestiones ?? [];
  const allDificultades = catalog?.dificultades ?? [];

  // Áreas come directly from the hierarchy
  const allAreas = React.useMemo(
    () => hierarchy.map((a) => ({ value: a.id, label: a.titulo })),
    [hierarchy],
  );

  // Capítulos filtered by selected áreas
  const visibleCapitulos = React.useMemo(() => {
    if (areas.length === 0) return [];
    const areaSet = new Set(areas);
    return hierarchy
      .filter((a) => areaSet.has(a.id))
      .flatMap((a) => a.capitulos.map((c) => ({ value: c.id, label: c.titulo })));
  }, [hierarchy, areas]);

  // Temas filtered by selected capítulos
  const visibleTemas = React.useMemo(() => {
    if (capitulos.length === 0) return [];
    const capSet = new Set(capitulos);
    return hierarchy
      .flatMap((a) => a.capitulos)
      .filter((c) => capSet.has(c.id))
      .flatMap((c) => c.temas.map((t) => ({ value: t.id, label: t.titulo })));
  }, [hierarchy, capitulos]);

  // Auto-select all capítulos when áreas change

  // Auto-select all temas when capítulos change
  React.useEffect(() => {
    setTemas(visibleTemas.map((t) => t.value));
  }, [visibleTemas]);

  const toggleValue = React.useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<string[]>>,
      value: string,
      checked: boolean,
    ) => {
      setter((prev) => {
        if (checked) {
          if (prev.includes(value)) return prev;
          return [...prev, value];
        }
        return prev.filter((item) => item !== value);
      });
    },
    [],
  );

  const onCreateBanqueo = async (event: React.FormEvent) => {
    event.preventDefault();
    const duracionNum = duracion ?? Number.NaN;
    const maxNum = maxPreguntas ?? Number.NaN;

    if (!titulo.trim()) {
      console.log('malo')
      toast.error("El titulo es obligatorio.");
      return;
    }

    if (!Number.isInteger(duracionNum) || duracionNum <= 0) {
      setError("Duracion invalida.");
      return;
    }
    if (!Number.isInteger(maxNum) || maxNum <= 0 || maxNum > 100) {
      setError("Maximo de preguntas invalido. Debe ser entre 1 y 100.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Step 1: Generate random questions
      const genResponse = await fetch("/api/banqueo/seleccionar-aleatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: maxNum,
          filters: {
            gestiones,
            temas,
            capitulos,
            areas,
            dificultades,
          },
        }),
      });
      const genBody = (await genResponse.json().catch(() => null)) as
        | { message?: string; preguntas?: PreguntaItem[] }
        | null;

      if (!genResponse.ok) {
        setError(genBody?.message ?? "No se pudo generar preguntas.");
        return;
      }

      const generatedQuestions = genBody?.preguntas ?? [];
      if (generatedQuestions.length === 0) {
        setError("No se encontraron preguntas con los filtros seleccionados.");
        return;
      }

      // Step 2: Create the banqueo
      const createResponse = await fetch("/api/banqueos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          tipo: "FREE",
          duracion: duracionNum,
          maxPreguntas: maxNum,
          preguntaIds: generatedQuestions.map((item) => item.id),
        }),
      });
      const createPayload = (await createResponse.json().catch(() => null)) as { message?: string; id?: string } | null;

      if (!createResponse.ok) {
        setError(createPayload?.message ?? "No se pudo crear el banqueo.");
        return;
      }

      toast.success("Banqueo creado. Redirigiendo a la prueba...");
      const banqueoId = createPayload?.id;
      if (banqueoId) {
        router.push(`/prueba/${banqueoId}`);
      } else {
        router.push("/mis-banqueos");
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto  max-w-5xl space-y-4">
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader size={120} variant="cube" />
            <p className="text-sm font-medium">Creando banqueo...</p>
          </div>
        </div>
      )}
      <h1 className="text-3xl">Crear banqueo</h1>

      <form className="space-y-4" onSubmit={onCreateBanqueo} ref={formRef}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3  md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                className={CONTROL_HEIGHT_CLASS}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Ej. Mi banqueo personalizado"
                value={titulo}
              />
            </div>
            <div className="space-y-2">
              <Label>Duración (min)</Label>
              <NumberField min={1} onValueChange={(value) => setDuracion(value)} step={1} value={duracion}>
                <NumberFieldGroup className={CONTROL_HEIGHT_CLASS}>
                  <NumberFieldDecrement />
                  <NumberFieldInput
                    className="h-9 text-center text-sm leading-9 sm:h-9 sm:leading-9"
                    placeholder="Ej. 60"
                  />
                  <NumberFieldIncrement />
                </NumberFieldGroup>
              </NumberField>
            </div>
            <div className="space-y-2">
              <Label>Máximo preguntas</Label>
              <NumberField
                max={100}
                min={1}
                onValueChange={(value) => setMaxPreguntas(value)}
                step={1}
                value={maxPreguntas}
              >
                <NumberFieldGroup className={CONTROL_HEIGHT_CLASS}>
                  <NumberFieldDecrement />
                  <NumberFieldInput
                    className="h-9 text-center text-sm leading-9 sm:h-9 sm:leading-9"
                    placeholder="Ej. 20"
                  />
                  <NumberFieldIncrement />
                </NumberFieldGroup>
              </NumberField>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Áreas */}
          <div className="space-y-4">
            <Label className="!text-2xl">Áreas</Label>
            {allAreas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {allAreas.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                    <Checkbox
                      checked={areas.includes(item.value)}
                      onCheckedChange={(checked) => toggleValue(setAreas, item.value, checked === true)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
                {
                  areas.length < allAreas.length && (
                    <Button
                      size={'xs'}
                      variant={'secondary'}
                      onClick={() => setAreas(allAreas.map((item) => item.value))}
                    >
                      Seleccionar todas
                    </Button>
                  )
                }
                {
                  areas.length > 0 && (
                    <Button
                      size={'xs'}
                      variant={'secondary'}
                      onClick={() => setAreas([])}
                    >
                      Limpiar selección
                    </Button>
                  )
                }
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin áreas registradas</p>
            )}
          </div>

          {/* Capítulos — only when áreas selected */}
          {areas.length > 0 && (
            <div className="space-y-4 ">
              <Label className="!text-2xl" >Capítulos</Label>
              {visibleCapitulos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {visibleCapitulos.map((item) => (
                    <label key={item.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <Checkbox
                        checked={capitulos.includes(item.value)}
                        onCheckedChange={(checked) => toggleValue(setCapitulos, item.value, checked === true)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                  {visibleCapitulos.length > 0 && capitulos.length == 0 && (
                    <Button
                      size={'xs'}
                      variant={'secondary'}
                      onClick={() => setCapitulos(visibleCapitulos.map((item) => item.value))}
                    >
                      Seleccionar todas
                    </Button>
                  )}
                  {visibleCapitulos.length > 0 && capitulos.length > 0 && (
                    <Button
                      size={'xs'}
                      variant={'secondary'}
                      onClick={() => setCapitulos([])}
                    >
                      Limpiar selección
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin capítulos para las áreas seleccionadas</p>
              )}
            </div>
          )}

          {/* Temas — only when capítulos selected */}
          {capitulos.length > 0 && (
            <div className="space-y-4 ">
              <Label className="!text-2xl" >Temas</Label>
              {visibleTemas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {visibleTemas.map((item) => (
                    <label key={item.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                      <Checkbox
                        checked={temas.includes(item.value)}
                        onCheckedChange={(checked) => toggleValue(setTemas, item.value, checked === true)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}

                  {visibleTemas.length > 0 && temas.length == 0 && (
                    <Button
                      size={'xs'}
                      variant={'secondary'}
                      onClick={() => setTemas(visibleTemas.map((item) => item.value))}
                    >
                      Seleccionar todas
                    </Button>
                  )}
                  {visibleTemas.length > 0 && temas.length > 0 && (
                    <Button
                      size={'xs'}
                      variant={'secondary'}
                      onClick={() => setTemas([])}
                    >
                      Limpiar selección
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin temas para los capítulos seleccionados</p>
              )}
            </div>
          )}

          {/* Gestión */}
          <div className="space-y-4 ">
            <Label className="!text-2xl" >Gestión</Label>
            {allGestiones.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {allGestiones.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                    <Checkbox
                      checked={gestiones.includes(item.value)}
                      onCheckedChange={(checked) => toggleValue(setGestiones, item.value, checked === true)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin gestiones disponibles</p>
            )}
          </div>

          {/* Dificultad */}
          <div className="space-y-4 ">
            <Label className="!text-2xl" >Dificultad</Label>
            {allDificultades.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {allDificultades.map((item) => (
                  <label key={item.value} className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors">
                    <Checkbox
                      checked={dificultades.includes(item.value)}
                      onCheckedChange={(checked) => toggleValue(setDificultades, item.value, checked === true)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin dificultades disponibles</p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button
            disabled={isSubmitting || !catalog}
            onClick={() => setIsConfirmOpen(true)}
            type="button"
          >
            {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : <ShuffleIcon className="size-4" />}
            Crear banqueo
          </Button>
        </div>
      </form>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent centered className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar creación</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará el banqueo con preguntas aleatorias según los filtros seleccionados y se redirigirá automáticamente a la prueba. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button disabled={isSubmitting} type="button" variant="outline">
                Cancelar
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  setIsConfirmOpen(false);
                  formRef.current?.requestSubmit();
                }}
                type="button"
              >
                {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Crear y empezar
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
