'use client'

import * as React from "react"
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@/components/ui/combobox"
import { Eye, Search, Play } from 'lucide-react'
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useParams } from "next/navigation"
import Loading from "@/components/ui/loading"
import { BanqueosGET } from "../api/banqueos/get"
import { formatDateTime } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label";
import { AreasGET } from "../api/areas/get";
import { TemasGET } from "../api/temas/get";
import { CapitulosGET } from "../api/capitulos/get";
import { fetcher } from "@/helpers/fetchers";



export default function CursoClient() {
  const [search, setSearch] = React.useState('')
  const [areas, setAreas] = React.useState<AreasGET>([])
  const [temas, setTemas] = React.useState<TemasGET>([]);
  const [capitulos, setCapitulos] = React.useState<CapitulosGET>([]);
  //selected 
  const [selectedAreas, setSelectedAreas] = React.useState<string[]>([]);
  const [selectedTemas, setSelectedTemas] = React.useState<string[]>([]);
  const [selectedCapitulos, setSelectedCapitulos] = React.useState<string[]>([]);
  const [bancos, setBancos] = React.useState<BanqueosGET>([]);
  const [loading, setLoading] = React.useState(false);

  const params = useParams();

  React.useEffect(() => {
    setLoading(true);
    fetcher<BanqueosGET>(`/banqueos?search=${search}&areas=${selectedAreas.join(',')}&temas=${selectedTemas.join(',')}&capitulos=${selectedCapitulos.join(',')}`).then(setBancos).finally(() => setLoading(false));
  }, [params, selectedAreas, selectedCapitulos, selectedTemas, search]);

  React.useEffect(() => {
    fetcher<AreasGET>('/areas').then(setAreas);
  }, []);
  React.useEffect(() => {
    fetcher<CapitulosGET>(`/capitulos?areas=${selectedAreas.join(',')}`).then(setCapitulos);
  }, [selectedAreas]);

  React.useEffect(() => {
    fetcher<TemasGET>(`/temas?capitulos=${selectedCapitulos.join(',')}`).then(setTemas);
  }, [selectedCapitulos]);
  const [banqueo, setBanqueo] = React.useState<BanqueosGET[number] | null>(null);


  return (
    <div className="container mx-auto  space-y-4">
      <h1 className="text-3xl">Banqueos Nexus</h1>
      <p className="text-muted-foreground">Encuentra banqueos creados por la comunidad y por tus profesores para practicar tus conocimientos.</p>
      <Card>
        <CardContent>
          <Button size={'sm'} variant={'outline'}>
            Limpiar Filtros
          </Button>
          <div className="gap-4 grid grid-cols-2  lg:grid-cols-4 ">
            <div className="space-y-2 col-span-2 sm:col-span-4 lg:col-span-2">
              <Label>
                Buscador
              </Label>
              <InputGroup>
                <InputGroupInput placeholder="Buscar banqueos..." value={search} onValueChange={(value) => setSearch(value)} />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-4 lg:col-span-2">
              <Label>Áreas</Label>
              <Combobox
                multiple
                value={selectedAreas}
                onValueChange={(value) => {
                  setSelectedAreas(value);
                  setSelectedCapitulos([]);
                  setSelectedTemas([]);
                }}
                items={areas.map(area => ({
                  label: area.titulo,
                  value: area.id
                }))}>
                <ComboboxChips>
                  <ComboboxValue>
                    {selectedAreas.map((item) => (
                      <ComboboxChip key={item}>{areas.find(a => a.id === item)?.titulo}</ComboboxChip>
                    ))}
                  </ComboboxValue>
                  <ComboboxChipsInput placeholder="Áreas" />
                </ComboboxChips>
                <ComboboxPopup>
                  <ComboboxEmpty>Áreas no encontradas</ComboboxEmpty>
                  <ComboboxList>
                    {areas.map(area => (
                      <ComboboxItem key={area.id} value={area.id}>
                        {area.titulo}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-4 lg:col-span-2">
              <Label>Capitulos</Label>
              <Combobox
                multiple
                value={selectedCapitulos}
                onValueChange={(value) => {
                  setSelectedCapitulos(value);
                  setSelectedTemas([]);
                }}
                items={capitulos.map(capitulo => ({
                  label: capitulo.titulo,
                  value: capitulo.id
                }))}>
                <ComboboxChips>
                  <ComboboxValue>
                    {selectedCapitulos.map((item) => (
                      <ComboboxChip key={item}>{capitulos.find(c => c.id === item)?.titulo}</ComboboxChip>
                    ))}
                  </ComboboxValue>
                  <ComboboxChipsInput placeholder="Capítulos" />
                </ComboboxChips>
                <ComboboxPopup>
                  <ComboboxEmpty>Capítulos no encontrados</ComboboxEmpty>
                  <ComboboxList>
                    {capitulos.map(capitulo => (
                      <ComboboxItem key={capitulo.id} value={capitulo.id}>
                        {capitulo.titulo}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-4 lg:col-span-2">
              <Label>Temas</Label>

              <Combobox items={temas.map(tema => ({
                label: tema.titulo,
                value: tema.id
              }))} value={selectedTemas} onValueChange={setSelectedTemas} multiple>
                <ComboboxChips>
                  <ComboboxValue>
                    {selectedTemas.map((item) => (
                      <ComboboxChip key={item}>{temas.find(c => c.id === item)?.titulo}</ComboboxChip>
                    ))}
                  </ComboboxValue>
                  <ComboboxChipsInput placeholder="Temas" />
                </ComboboxChips>                                <ComboboxPopup>
                  <ComboboxEmpty>Temas no encontrados</ComboboxEmpty>
                  <ComboboxList>
                    {temas.map(tema => (
                      <ComboboxItem key={tema.id} value={tema.id}>
                        {tema.titulo}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          {
            loading ? (
              <div className="flex items-center justify-center"> <Loading /> </div>
            ) : (
              bancos.map(banqueo => {
                return (
                  <Item variant='outline' key={banqueo.id} >

                    <ItemContent>
                      <ItemTitle >

                        {banqueo.titulo}

                      </ItemTitle>
                      <div className="flex gap-2">
                        <Badge variant={'secondary'} className={`${banqueo.tipo === 'PRO' && 'bg-amber-700'}`}>
                          {banqueo.tipo}
                        </Badge>
                        <Badge variant={'outline'}>
                          {banqueo.duracion} min
                        </Badge>
                        <Badge variant={"outline"}>
                          {banqueo.maxPreguntas} preguntas
                        </Badge>

                      </div>
                      <p className="text-muted-foreground text-xs">
                        Publicado el: {formatDateTime(banqueo.creadoEn)}
                      </p>
                    </ItemContent>
                    <ItemActions>

                      <Button size="sm" variant="secondary" onClick={() => setBanqueo(banqueo)}>
                        Intentar ahora

                      </Button>
                    </ItemActions>
                  </Item>
                )
              })
            )}


        </CardContent>
      </Card>
      <Sheet open={!!banqueo} onOpenChange={(open) => !open && setBanqueo(null)} >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{banqueo?.titulo}</SheetTitle>
          </SheetHeader>

          <div className="px-6 pb-6 max-h-96 overflow-y-auto space-y-4">
            <div>

              <p className="text-sm text-muted-foreground">Duración Banqueo: <span className="font-medium">{banqueo?.duracion}</span> min</p>
              <p className="text-sm text-muted-foreground">Maximo de preguntas: <span className="font-medium">{banqueo?.maxPreguntas}</span></p>
            </div>
            <Separator />
            <div className="flex gap-2 items-center flex-wrap">
              <p className="text-sm ">Áreas:</p>

              {[...new Map(
                banqueo?.preguntas
                  .flatMap(p => p.areas)
                  .map(area => [area.id, area])
              ).values()].map(area => (
                <Badge key={area.id} variant="outline">
                  {area.titulo}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <p className="text-sm ">Capitulos:</p>

              {[...new Map(
                banqueo?.preguntas
                  .flatMap(p => p.capitulos)
                  .map(capitulo => [capitulo.id, capitulo])
              ).values()].map(capitulo => (
                <Badge key={capitulo.id} variant="outline">
                  {capitulo.titulo}
                </Badge>
              ))}

            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <p className="text-sm ">Temas:</p>
              {
                [... new Map(
                  banqueo?.preguntas.flatMap(p => p.temas).map(tema => [tema.id, tema])
                ).values()].map(tema => (
                  <Badge key={tema.id} variant="outline">
                    {tema.titulo}
                  </Badge>
                ))}

            </div>
          </div>
          <SheetFooter>
            <Button render={
              <Link href={`/prueba/${banqueo?.id}`}>
                <Play />
                Empezar Banqueo
              </Link>
            } >
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>

  )
}