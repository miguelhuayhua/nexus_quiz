import { Loader } from "@/components/ui/loader"

const Loading = () => {
    return (
        <div className="flex p-10 items-center justify-center h-full">
            <Loader variant="cube" />
        </div>
    )
}

export default Loading