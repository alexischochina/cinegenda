export function usePrioToggle() {
    const { movies, setPrio } = useMovieCalendar()
    const { announceMovie } = useMovieHighlight()

    const togglePrio = async (id, value) => {
        const title = movies.value.find(m => m.id === id)?.title
        if (await setPrio(id, value)) announceMovie(prioAnnouncement(title, value))
    }

    return { togglePrio }
}
