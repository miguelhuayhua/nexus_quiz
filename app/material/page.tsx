'use client'

import * as React from "react"
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useParams } from "next/navigation"
import Loading from "@/components/ui/loading"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label";
import { fetcher, fetchResource } from "@/helpers/fetchers";
import { MaterialesGET } from "../api/materiales/get";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import Link from "next/link";
import { GestionesGET } from "../api/materiales/gestiones/get";



export default function CursoClient() {
  const [search, setSearch] = React.useState('')
  //selected 
  const [materiales, setMateriales] = React.useState<MaterialesGET>([]);
  const [loading, setLoading] = React.useState(false);

  const params = useParams();
  const [gestiones, setGestiones] = React.useState<GestionesGET>([]);
  React.useEffect(() => {
    fetcher<GestionesGET>(`/materiales/gestiones`).then(setGestiones);
  }, []);
  const [selectedGestiones, setSelectedGestiones] = React.useState<string[]>([]);
  React.useEffect(() => {
    setLoading(true);
    fetcher<MaterialesGET>(`/materiales?search=${search}&gestiones=${selectedGestiones.join(',')}`).then(setMateriales).finally(() => setLoading(false));
  }, [params, search, selectedGestiones]);

  const [material, setMaterial] = React.useState<MaterialesGET[number] | null>(null);


  return (
    <div className="container mx-auto  space-y-4">
      <h1 className="text-3xl">Materiales Nexus</h1>
      <p className="text-muted-foreground">Encuentra banqueos creados por la comunidad y por tus profesores para practicar tus conocimientos.</p>
      <Card>
        <CardContent>
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
              <Label>Gestiones</Label>
              <Combobox
                multiple
                value={selectedGestiones}
                onValueChange={(value) => {
                  setSelectedGestiones(value);
                }}
                items={gestiones.map(gestion => ({
                  label: gestion,
                  value: gestion
                }))}>
                <ComboboxChips>
                  <ComboboxValue>
                    {selectedGestiones.map((item) => (
                      <ComboboxChip key={item}>{item}</ComboboxChip>
                    ))}
                  </ComboboxValue>
                  <ComboboxChipsInput placeholder="Gestiones" />
                </ComboboxChips>
                <ComboboxPopup>
                  <ComboboxEmpty>Gestiones no encontradas</ComboboxEmpty>
                  <ComboboxList>
                    {gestiones.map(gestion => (
                      <ComboboxItem key={gestion} value={gestion}>
                        {gestion}
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
            materiales.length == 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search />
                  </EmptyMedia>
                  <EmptyTitle>No se encontraron materiales</EmptyTitle>
                  <EmptyDescription>
                    Intenta ajustar tu búsqueda o filtros.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )
          }
          {
            loading ? (
              <div className="flex items-center justify-center"> <Loading /> </div>
            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {
                  materiales.map(material => {
                    return (
                      <Item variant='outline' key={material.id} >

                        <ItemContent>
                          <ItemTitle >

                            {material.titulo}

                          </ItemTitle>
                        </ItemContent>
                        <ItemActions>

                          <Button size="sm" variant="secondary" onClick={() => setMaterial(material)}>
                            Ver Material

                          </Button>
                        </ItemActions>
                      </Item>
                    )
                  })
                }
              </div>
            )}


        </CardContent>
      </Card>
      <Sheet open={!!material} onOpenChange={(open) => !open && setMaterial(null)} >
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{material?.titulo}</SheetTitle>
          </SheetHeader>

          <div className="px-6 pb-6 max-h-96 overflow-y-auto space-y-4">

            <p className="text-muted-foreground">
              {material?.descripcion}
            </p>
            <p className="text-muted-foreground">
              Gestión: <span className="font-semibold text-primary">{material?.gestion}</span>
            </p>
          </div>
          <SheetFooter>
            <Button render={<Link href={fetchResource(material?.url)} target="_blank" />}>
              Ver Recurso
            </Button>
          </SheetFooter>

        </SheetContent>
      </Sheet>
    </div>

  )
}