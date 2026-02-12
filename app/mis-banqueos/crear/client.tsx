"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, ShuffleIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteStatus,
} from "@/components/ui/autocomplete";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@/components/ui/combobox";
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
import { Spinner } from "@/components/ui/spinner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SelectOption = { label: string; value: string };

const DIFICULTAD_OPTIONS: SelectOption[] = [
  { label: "Baja", value: "SENCILLO" },
  { label: "Media", value: "MEDIO" },
  { label: "Alta", value: "DIFICIL" },
];

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

function formatDificultadLabel(value: PreguntaItem["dificultad"]) {
  if (value === "SENCILLO") return "Fácil";
  if (value === "DIFICIL") return "Difícil";
  return "Medio";
}

function toSingleValue(
  input: unknown,
  optionMap: Map<string, SelectOption>,
  optionByLabelMap: Map<string, SelectOption>,
): string {
  if (!input) return "";

  if (typeof input === "string") {
    if (optionMap.has(input)) return input;
    const byLabel = optionByLabelMap.get(input.trim().toLowerCase());
    return byLabel?.value ?? "";
  }

  if (typeof input === "object" && "value" in input) {
    const raw = (input as { value?: unknown }).value;
    return typeof raw === "string" ? raw : "";
  }

  return "";
}

function GestionComboboxField({
  options,
  value,
  onChange,
}: {
  options: SelectOption[];
  value: string;
  onChange: (next: string) => void;
}) {
  const optionMap = React.useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );
  const optionByLabelMap = React.useMemo(
    () =>
      new Map(
        options.map((option) => [option.label.trim().toLowerCase(), option]),
      ),
    [options],
  );
  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  return (
    <div className="space-y-2">
      <Label>Gestión</Label>
      <Combobox
        items={options}
        onValueChange={(next) => {
          const normalized = toSingleValue(next, optionMap, optionByLabelMap);
          onChange(normalized);
        }}
        value={selectedOption}
      >
        <ComboboxInput
          className="w-full"
          placeholder="Selecciona gestión..."
          size="default"
        />
        <ComboboxPopup>
          <ComboboxEmpty>Sin resultados</ComboboxEmpty>
          <ComboboxList className="px-1 py-1">
            {(item: SelectOption) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </div>
  );
}

function MultipleSelectField({
  label,
  placeholder,
  options,
  values,
  fixedHeight = false,
  centerBadges = false,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: SelectOption[];
  values: string[];
  fixedHeight?: boolean;
  centerBadges?: boolean;
  onChange: (values: string[]) => void;
}) {
  const selectedItems = React.useMemo(
    () => options.filter((option) => values.includes(option.value)),
    [options, values],
  );
  const optionMap = React.useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );
  const optionByLabelMap = React.useMemo(
    () =>
      new Map(
        options.map((option) => [option.label.trim().toLowerCase(), option]),
      ),
    [options],
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Combobox
        items={options}
        multiple
        onValueChange={(next) => {
          const normalized: unknown[] = Array.isArray(next)
            ? next
            : next
              ? [next]
              : [];
          const selected = normalized
            .map((item) => {
              if (typeof item === "string") {
                if (optionMap.has(item)) return item;
                const byLabel = optionByLabelMap.get(item.trim().toLowerCase());
                return byLabel?.value ?? "";
              }
              if (item && typeof item === "object" && "value" in item) {
                const raw = (item as { value?: unknown }).value;
                return typeof raw === "string" ? raw : "";
              }
              return "";
            })
            .filter((nextValue): nextValue is string => nextValue.length > 0);
          onChange(selected);
        }}
        value={selectedItems}
      >
        <ComboboxChips
          className={
            fixedHeight
              ? `h-9 flex-nowrap overflow-x-auto p-[3px] text-sm *:min-h-6 *:text-sm sm:*:min-h-6 ${centerBadges ? "justify-center" : ""}`
              : "min-h-9 p-[3px] text-sm *:min-h-6 *:text-sm sm:*:min-h-6"
          }
        >
          <ComboboxValue>
            {(current: SelectOption[]) => (
              <>
                {current?.map((item) => (
                  <ComboboxChip
                    aria-label={item.label}
                    className="inline-flex h-6 items-center rounded-md border border-border bg-accent px-2 text-sm leading-none"
                    key={item.value}
                  >
                    {item.label}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  aria-label={label}
                  className="text-sm"
                  placeholder={current.length > 0 ? undefined : placeholder}
                  size="sm"
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxPopup>
          <ComboboxEmpty className="hidden">Sin resultados</ComboboxEmpty>
          <ComboboxList className="px-1 py-1">
            {(item: SelectOption) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </div>
  );
}

function AsyncAutocompleteChipsField({
  label,
  placeholder,
  emptyMessage,
  fetcher,
  values,
  loadDefaultOptions = false,
  defaultOptionsLimit = 10,
  onChange,
}: {
  label: string;
  placeholder: string;
  emptyMessage: string;
  fetcher: (query: string) => Promise<SelectOption[]>;
  values: string[];
  loadDefaultOptions?: boolean;
  defaultOptionsLimit?: number;
  onChange: (next: string[]) => void;
}) {
  const [searchValue, setSearchValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SelectOption[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMap, setSelectedMap] = React.useState<Record<string, SelectOption>>({});

  React.useEffect(() => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      for (const option of searchResults) {
        next[option.value] = option;
      }
      return next;
    });
  }, [searchResults]);

  React.useEffect(() => {
    if (!searchValue && !loadDefaultOptions) {
      setSearchResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      try {
        const results = await fetcher(searchValue);
        const normalizedResults =
          !searchValue && loadDefaultOptions
            ? results.slice(0, Math.max(10, defaultOptionsLimit))
            : results;
        if (!ignore) {
          setSearchResults(normalizedResults);
        }
      } catch {
        if (!ignore) {
          setError("No se pudo cargar resultados.");
          setSearchResults([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      ignore = true;
    };
  }, [defaultOptionsLimit, fetcher, loadDefaultOptions, searchValue]);

  const handleSelect = React.useCallback(
    (option: SelectOption) => {
      if (values.includes(option.value)) return;
      setSelectedMap((prev) => ({ ...prev, [option.value]: option }));
      onChange([...values, option.value]);
      setSearchValue("");
      setSearchResults([]);
    },
    [onChange, values],
  );

  const removeValue = React.useCallback(
    (valueToRemove: string) => {
      onChange(values.filter((value) => value !== valueToRemove));
    },
    [onChange, values],
  );

  let status: React.ReactNode = `${searchResults.length} resultado${searchResults.length === 1 ? "" : "s"}`;
  if (isLoading) {
    status = (
      <span className="flex items-center justify-between gap-2 text-muted-foreground">
        Buscando...
        <Spinner className="size-4.5 sm:size-4" />
      </span>
    );
  } else if (error) {
    status = <span className="font-normal text-destructive text-sm">{error}</span>;
  } else if (searchResults.length === 0 && searchValue) {
    status = <span className="font-normal text-muted-foreground text-sm">{emptyMessage}</span>;
  }

  const shouldRenderPopup = searchValue !== "" || (loadDefaultOptions && isFocused);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Autocomplete
        filter={null}
        items={searchResults}
        itemToStringValue={(item: unknown) => (item as SelectOption).label}
        onValueChange={setSearchValue}
        value={searchValue}
      >
        <AutocompleteInput
          className="h-9 text-sm"
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 120);
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
        />
        {shouldRenderPopup && (
          <AutocompletePopup aria-busy={isLoading || undefined}>
            <AutocompleteStatus className="text-muted-foreground">
              {status}
            </AutocompleteStatus>
            <AutocompleteList>
              {(option: SelectOption) => (
                <AutocompleteItem
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  value={option}
                >
                  {option.label}
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompletePopup>
        )}
      </Autocomplete>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((currentValue) => {
            const option = selectedMap[currentValue];
            const labelText = option?.label ?? currentValue;
            return (
              <span
                className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-accent px-2 text-xs"
                key={currentValue}
              >
                <span className="max-w-32 truncate">{labelText}</span>
                <button
                  aria-label={`Quitar ${labelText}`}
                  onClick={() => removeValue(currentValue)}
                  type="button"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function fetchCatalogOptions(endpoint: string, query = ""): Promise<SelectOption[]> {
  try {
    const url = new URL(endpoint, window.location.origin);
    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    }

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) return [];

    const body = (await response.json()) as unknown;
    const rawItems = Array.isArray(body)
      ? body
      : body && typeof body === "object"
        ? ((body as Record<string, unknown>).data ??
          (body as Record<string, unknown>).items ??
          (body as Record<string, unknown>).areas ??
          (body as Record<string, unknown>).temas ??
          (body as Record<string, unknown>).capitulos ??
          (body as Record<string, unknown>).gestiones ??
          [])
        : [];

    if (!Array.isArray(rawItems)) return [];

    return rawItems
      .map((item) => {
        if (typeof item === "number" && Number.isInteger(item)) {
          return { value: String(item), label: String(item) };
        }
        if (!item || typeof item !== "object") return null;
        const candidate = item as Record<string, unknown>;
        const id =
          typeof candidate.id === "string"
            ? candidate.id
            : typeof candidate.gestion === "number" && Number.isInteger(candidate.gestion)
              ? String(candidate.gestion)
              : "";
        const titulo =
          typeof candidate.titulo === "string"
            ? candidate.titulo
            : typeof candidate.nombre === "string"
              ? candidate.nombre
              : typeof candidate.gestion === "number" && Number.isInteger(candidate.gestion)
                ? String(candidate.gestion)
                : "";
        return id && titulo ? { value: id, label: titulo } : null;
      })
      .filter((item): item is SelectOption => item !== null);
  } catch {
    return [];
  }
}

export default function CrearBanqueoClient({ hasPro }: { hasPro: boolean }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const CONTROL_HEIGHT_CLASS = "h-9 text-sm";

  const [titulo, setTitulo] = React.useState("");
  const [duracion, setDuracion] = React.useState<number | null>(60);
  const [maxPreguntas, setMaxPreguntas] = React.useState<number | null>(20);
  const [gestion, setGestion] = React.useState("");
  const [gestionOptions, setGestionOptions] = React.useState<SelectOption[]>([]);
  const [temas, setTemas] = React.useState<string[]>([]);
  const [capitulos, setCapitulos] = React.useState<string[]>([]);
  const [areas, setAreas] = React.useState<string[]>([]);
  const [dificultades, setDificultades] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<PreguntaItem[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function loadGestiones() {
      const items = await fetchCatalogOptions("/api/gestiones/list");
      if (!mounted) return;
      setGestionOptions(items);
    }
    void loadGestiones();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchAreas = React.useCallback((query: string) => fetchCatalogOptions("/api/areas/list", query), []);
  const fetchCapitulos = React.useCallback((query: string) => fetchCatalogOptions("/api/capitulos/list", query), []);
  const fetchTemas = React.useCallback((query: string) => fetchCatalogOptions("/api/temas/list", query), []);

  const buildFilters = React.useCallback(() => {
    const gestionRaw = gestion.trim();
    const gestionNum = gestionRaw.length > 0 ? Number.parseInt(gestionRaw, 10) : Number.NaN;

    return {
      gestion: gestionRaw.length > 0 && Number.isInteger(gestionNum) ? gestionNum : undefined,
      temas,
      capitulos,
      areas,
      dificultades,
    };
  }, [areas, capitulos, dificultades, gestion, temas]);

  const onGenerate = async () => {
    const count = maxPreguntas ?? Number.NaN;
    if (!Number.isInteger(count) || count <= 0 || count > 100) {
      toast.error("Máximo de preguntas inválido. Debe ser entre 1 y 100.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/banqueo/seleccionar-aleatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          filters: buildFilters(),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { message?: string; preguntas?: PreguntaItem[] }
        | null;

      if (!response.ok) {
        setError(body?.message ?? "No se pudo generar.");
        return;
      }

      setSelected(body?.preguntas ?? []);
      toast.success("Preguntas generadas.");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasPro) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const duracionNum = duracion ?? Number.NaN;
      const maxNum = maxPreguntas ?? Number.NaN;

      if (!titulo.trim()) {
        setError("El título es obligatorio.");
        return;
      }
      if (!Number.isInteger(duracionNum) || duracionNum <= 0) {
        setError("Duración inválida.");
        return;
      }
      if (!Number.isInteger(maxNum) || maxNum <= 0) {
        setError("Máximo de preguntas inválido.");
        return;
      }
      if (maxNum > 100) {
        setError("El máximo de preguntas debe ser menor o igual a 100.");
        return;
      }
      if (selected.length === 0) {
        setError("Primero genera preguntas.");
        return;
      }

      const response = await fetch("/api/banqueos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          tipo: "FREE",
          duracion: duracionNum * 60,
          maxPreguntas: maxNum,
          preguntaIds: selected.map((item) => item.id),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? "No se pudo crear el banqueo.");
        return;
      }

      toast.success("Banqueo creado.");
      router.push("/mis-banqueos");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-6">
      {isGenerating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader size={40} variant="cube" />
            <p className="text-sm font-medium">Generando banqueo...</p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Crear banqueo</h1>
        </div>
      </header>

      <form className="space-y-4" onSubmit={onCreate} ref={formRef}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parámetros del banqueo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  className={CONTROL_HEIGHT_CLASS}
                  placeholder="Ej. Banqueo semanal"
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros de preguntas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <GestionComboboxField
                onChange={setGestion}
                options={gestionOptions}
                value={gestion}
              />
              <AsyncAutocompleteChipsField
                emptyMessage="No se encontraron temas."
                fetcher={fetchTemas}
                label="Temas"
                onChange={setTemas}
                placeholder="Buscar temas..."
                values={temas}
              />
              <AsyncAutocompleteChipsField
                emptyMessage="No se encontraron capítulos."
                fetcher={fetchCapitulos}
                label="Capítulos"
                onChange={setCapitulos}
                placeholder="Buscar capítulos..."
                values={capitulos}
              />
              <AsyncAutocompleteChipsField
                emptyMessage="No se encontraron áreas."
                fetcher={fetchAreas}
                label="Áreas"
                loadDefaultOptions
                onChange={setAreas}
                placeholder="Buscar áreas..."
                values={areas}
              />
              <MultipleSelectField
                fixedHeight
                centerBadges
                label="Dificultad"
                onChange={setDificultades}
                options={DIFICULTAD_OPTIONS}
                placeholder="Buscar dificultad..."
                values={dificultades}
              />
            </div>

            <div className="flex justify-end">
              <Button
                disabled={!hasPro || isGenerating}
                onClick={onGenerate}
                type="button"
                variant="secondary"
              >
                {isGenerating ? <Loader2Icon className="size-4 animate-spin" /> : <ShuffleIcon className="size-4" />}
                Generar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preguntas</CardTitle>
            <CardDescription>Lista aleatoria generada</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Dificultad</TableHead>
                  <TableHead>Pregunta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={4}>
                      Sin preguntas.
                    </TableCell>
                  </TableRow>
                ) : (
                  selected.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{item.codigo}</TableCell>
                      <TableCell>{formatDificultadLabel(item.dificultad)}</TableCell>
                      <TableCell className="max-w-[560px] truncate">{item.pregunta}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {!hasPro && (
          <p className="text-sm text-muted-foreground">
            Necesitas suscripción Pro activa para crear banqueos.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button
            disabled={!hasPro || isSubmitting || selected.length === 0}
            onClick={() => setIsConfirmOpen(true)}
            type="button"
          >
            {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Guardar banqueo
          </Button>
        </div>
      </form>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent centered className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar guardado</AlertDialogTitle>
            <AlertDialogDescription>
              Se guardará este banqueo con las preguntas generadas actualmente. ¿Deseas continuar?
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
                Confirmar guardado
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
