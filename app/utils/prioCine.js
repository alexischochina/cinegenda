// ⚠️ Prio → À rattraper (`prioExitPatch`) est un invariant ; À rattraper → prio
// (`returnToTheatersPatch`) exige une preuve de séances, que seule la synchro Allociné détient.
import { releaseDateOf, yearOfMovie, dayMonthShort } from './movieDate.js';
import { parseLocalDate } from './localDate.js';

// NFD ne décompose pas les ligatures : « coeur » doit trouver « Le Cœur battant ».
const fold = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const byTitle = (a, b) =>
    String(a?.title ?? '').localeCompare(String(b?.title ?? ''), 'fr', { sensitivity: 'base' });

export const canAddToPrio = (movie) =>
    movie?.media === 'cinema' && movie?.state === 'inTheaters' && !movie?.prio;

export function sortPrio(list) {
    return (list ?? [])
        .map(movie => ({ movie, time: releaseDateOf(movie)?.getTime() ?? null }))
        .sort((a, b) => {
            if (a.time !== b.time) {
                if (a.time === null) return 1;
                if (b.time === null) return -1;
                return a.time - b.time;
            }
            return byTitle(a.movie, b.movie);
        })
        .map(entry => entry.movie);
}

export function prioCandidates(list, term = '') {
    const needle = fold(term);
    return sortPrio((list ?? []).filter(movie =>
        canAddToPrio(movie) && (!needle || fold(movie.title).includes(needle))
    ));
}

// ⚠️ `yearOfMovie` et surtout pas `yearOf(release_date)` : `new Date(null)` vaut 1970, un film sans
// date partirait dans « À rattraper 1970 », invisible de toutes les vues.
export function prioExitPatch(movie, { now = new Date().toISOString(), currentYear = new Date().getFullYear() } = {}) {
    if (!movie?.prio) return null;
    if (movie.state === 'seen' || movie.media !== 'cinema') return { prio: false };
    if (movie.state === 'inTheaters') return null;
    if (movie.catchup) return { prio: false };
    return { prio: false, catchup: true, catchup_at: now, catchup_year: yearOfMovie(movie) ?? currentYear };
}

export const prioDateLabel = (movie, currentYear = new Date().getFullYear()) => {
    const date = parseLocalDate(movie?.release_date) ?? releaseDateOf(movie);
    if (!date) return 'Sans date';
    const label = dayMonthShort(date);
    return date.getFullYear() === currentYear ? label : `${label} ${date.getFullYear()}`;
};

export const prioAnnouncement = (title, added) => {
    const what = title ? `« ${title} »` : 'Film';
    return `${what} ${added ? 'ajouté aux' : 'retiré des'} prios ciné`;
};

export function returnToTheatersPatch(movie) {
    if (!movie?.catchup || movie.media !== 'cinema' || movie.state !== 'inTheaters') return null;
    return { catchup: false, catchup_at: null, prio: true };
}
