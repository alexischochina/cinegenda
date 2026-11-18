// Ajout d'un film à rattraper depuis l'onglet Listes + notice éphémère. La page `mes-listes` pose
// `catchupNotice` ; le layout persistant l'affiche et gère son auto-dismiss.
export function useCatchupFlow() {
    const { movies, addCatchupMovie, handleMovieAdded } = useMovieCalendar()
    const catchupNotice = useState('catchupNotice', () => null)

    // La liste est par année : un film qui sort une autre année atterrit dans la liste de SON
    // année → on le signale (référence = l'année de la vue Listes d'origine, `payload.year`).
    const onAddCatchupMovie = async (payload) => {
        const entry = await addCatchupMovie(payload)
        if (entry) await handleMovieAdded({ detail: { newEntry: entry } })

        const movie = movies.value.find(m => m.movie_id === Number(payload.movieId))
        if (!movie) return
        const landingYear = yearOfMovie(movie) ?? movie.catchup_year ?? null
        const refYear = payload.year ?? null
        if (landingYear !== refYear) {
            catchupNotice.value = {
                title: movie.title || 'Le film',
                yearLabel: landingYear === null ? 'Sans date' : String(landingYear),
            }
        }
    }

    return { catchupNotice, onAddCatchupMovie }
}
