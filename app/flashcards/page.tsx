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
import { Search, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"
import {
    Item,
    ItemContent,
    ItemTitle,
} from "@/components/ui/item"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { useParams, useRouter } from "next/navigation"
import Loading from "@/components/ui/loading"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label";
import { PreguntasGET } from "../api/preguntas/get";
import { fetcher } from "@/helpers/fetchers";
import { AreasGET } from "../api/areas/get";
import { CapitulosGET } from "../api/capitulos/get";
import { TemasGET } from "../api/temas/get";
import { sendWhatsapp } from "@/helpers/whatsapp";
import { UsuarioGET } from "../api/usuario/get";
import { useFlashcard } from "@/providers/flashcard-provider";



export default function CursoClient() {
    const [areas, setAreas] = React.useState<AreasGET>([])
    const [temas, setTemas] = React.useState<TemasGET>([]);
    const [capitulos, setCapitulos] = React.useState<CapitulosGET>([]);
    //selected 
    const [selectedAreas, setSelectedAreas] = React.useState<string[]>([]);
    const [selectedTemas, setSelectedTemas] = React.useState<string[]>([]);
    const [selectedCapitulos, setSelectedCapitulos] = React.useState<string[]>([]);
    const [preguntas, setPreguntas] = React.useState<PreguntasGET>([]);
    const [loading, setLoading] = React.useState(false);

    const params = useParams();
    const [user, setUser] = React.useState<UsuarioGET>(null);
    React.useEffect(() => {
        fetcher<UsuarioGET>('/usuario').then(setUser);
    }, []);
    React.useEffect(() => {
        setLoading(true);
        fetcher<PreguntasGET>(`/preguntas?areas=${selectedAreas.join(',')}&temas=${selectedTemas.join(',')}&capitulos=${selectedCapitulos.join(',')}`).then(setPreguntas).finally(() => setLoading(false));
    }, [params, selectedAreas, selectedCapitulos, selectedTemas]);

    React.useEffect(() => {
        fetcher<AreasGET>('/areas').then(setAreas);
    }, []);
    React.useEffect(() => {
        fetcher<CapitulosGET>(`/capitulos?areas=${selectedAreas.join(',')}`).then(setCapitulos);
    }, [selectedAreas]);

    React.useEffect(() => {
        fetcher<TemasGET>(`/temas?capitulos=${selectedCapitulos.join(',')}`).then(setTemas);
    }, [selectedCapitulos]);
    const { setFlashcards } = useFlashcard();
    const router = useRouter();
    return (
        <div className="container mx-auto  space-y-4">
            <h1 className="text-3xl">FlashCards</h1>

            <p className="text-muted-foreground">Encuentra banqueos creados por la comunidad y por tus profesores para practicar tus conocimientos.</p>
            {
                !user?.isPro && (
                    <Card className="bg-gradient-to-br from-green-600  to-green-900">

                        <CardContent >
                            <div className="flex items-center lg:gap-30 gap-4">

                                <div className="space-y-1" >
                                    <CardTitle >
                                        Sube a premium y desbloqueda todo el contenido
                                    </CardTitle>
                                    <CardDescription className="text-white/70">
                                        Modo pro, acceso a banqueos ilimitados, simulacros semanales a nivel nacional, ranking en vivo, activación en menos de 10 minutos por Whatsapp.
                                    </CardDescription>
                                </div>
                                <Button
                                    variant={'outline'}
                                    className="bg-white text-foreground"
                                    render={<Link href={sendWhatsapp("Hola, quiero subir a Pro en el Banqueo de Nexus Educa")} target="_blank" />}
                                >
                                    Hablar por Whatsapp
                                </Button>
                            </div>


                        </CardContent>
                    </Card>
                )
            }
            <Card>
                <CardContent>
                    <Button size={'sm'} onClick={() => {
                        setSelectedAreas([]);
                        setSelectedCapitulos([]);
                        setSelectedTemas([]);
                    }} variant={'outline'}>
                        Limpiar Filtros
                    </Button>
                    <div className="gap-4 grid grid-cols-1  lg:grid-cols-3 ">
                        <div className="space-y-2 col-span-1">
                            <Label>Áreas</Label>
                            <Combobox
                                multiple
                                value={selectedAreas}
                                onValueChange={setSelectedAreas}
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
                        <div className="space-y-2 col-span-1">
                            <Label>Capitulos</Label>
                            <Combobox
                                multiple
                                value={selectedCapitulos}
                                onValueChange={setSelectedCapitulos}
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
                        <div className="space-y-2 col-span-1">
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
                    {(preguntas.length === 0 && !loading) && <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Search />
                            </EmptyMedia>
                            <EmptyTitle>No hay flashcards aún</EmptyTitle>
                            <EmptyDescription>
                                No has filtrado de manera que haya flashcards. Intenta cambiar los filtros.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>}
                    {
                        (!loading) ? (
                            <>
                                {
                                    preguntas.length > 0 && (
                                        <>
                                            <div className="flex justify-between ">
                                                <CardTitle >Tarjetas Disponibles: {preguntas.length}
                                                    {
                                                        !user?.isPro && (<span className="text-primary">Max 15</span>)
                                                    }

                                                </CardTitle>
                                                <Button onClick={() => {
                                                    setFlashcards(preguntas)
                                                    router.push(`/flashcards/prueba`)
                                                }}>
                                                    Empezar a estudiar <PlayCircle />
                                                </Button>
                                            </div>
                                            {
                                                !user?.isPro && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Accede a una suscripción pro y obten acceso a todas las flashcards.
                                                        <Link
                                                            target="_blank"
                                                            className="underline text-green-500" href={sendWhatsapp("Hola, quiero subir a Pro")}>Pro</Link>
                                                    </p>
                                                )
                                            }
                                        </>
                                    )
                                }
                                {
                                    preguntas.map(pregunta => {
                                        return (
                                            <Item variant='outline' key={pregunta.id} >

                                                <ItemContent>
                                                    <ItemTitle >

                                                        {pregunta.enunciado}

                                                    </ItemTitle>
                                                    <div className="flex gap-2">
                                                        <Badge variant={'secondary'} >
                                                            {pregunta.dificultad}
                                                        </Badge>


                                                    </div>

                                                </ItemContent>

                                            </Item>
                                        )
                                    })
                                }

                            </>
                        ) : (
                            <Loading />
                        )
                    }
                </CardContent>
            </Card>

        </div>
    )
}