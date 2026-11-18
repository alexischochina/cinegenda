<script setup>
import { refDebounced } from "@vueuse/shared";

// Slider « À rattraper » : films personnellement marqués catchup pour l'année, + un slot
// « Ajouter » (dashed) en fin de bande, sans plafond. Clic carte → film dans la timeline. Clic
// « Ajouter » → popin de recherche : suggestions dans MA liste (non vus de l'année, hors salles),
// fallback API TMDB.
const props = defineProps({
    movies: { type: Array, default: () => [] },
    year: { type: [Number, null], default: null },
});

const emit = defineEmits(['toggle-catchup', 'go-to-movie', 'add-catchup-movie']);

// Films catchup de l'année : datés dans l'année, ou sans date FR mais rattachés via `catchup_year`.
// Ordre = date d'ajout (`catchup_at`) croissante, le plus récent à droite ; repli sur `id` si null.
const addedAt = (m) => (m.catchup_at ? new Date(m.catchup_at).getTime() : 0);
const catchup = computed(() =>
    props.movies
        .filter(m => m.catchup && (
            yearOf(m.release_date) === props.year ||
            (m.release_date == null && m.catchup_year === props.year)
        ))
        .sort((a, b) => addedAt(a) - addedAt(b) || a.id - b.id)
);

const heading = computed(() => props.year === null ? 'À rattraper — sans date' : `À rattraper en ${props.year}`);

// Films non vus, déjà sortis, de l'année, pas déjà catchup — vivier des suggestions « liste ».
const pool = computed(() =>
    props.movies.filter(m =>
        m.state !== 'seen' &&
        m.state !== 'inTheaters' &&
        !m.catchup &&
        yearOf(m.release_date) === props.year &&
        m.release_date && m.release_date <= today()
    )
);

// Le repli TMDB ne doit pas réintroduire un film en salle : `addCatchupMovie` reprend la ligne
// existante sans regarder son état.
const inTheatersIds = computed(() => new Set(
    props.movies.filter(m => m.state === 'inTheaters').map(m => Number(m.movie_id))
));

// ---- Popin de recherche ----
const showPicker = ref(false);
const query = ref('');
const slotBtn = ref(null);
const debouncedQuery = refDebounced(query, 300);
const tmdbMatches = ref([]);

const openPicker = () => {
    query.value = '';
    tmdbMatches.value = [];
    showPicker.value = true;
};
const closePicker = () => {
    showPicker.value = false;
};

const toOption = (m) => ({
    source: 'list',
    key: `l-${m.id}`,
    id: m.id,
    movie_id: m.movie_id,
    title: m.title,
    poster_path: m.poster_path,
    dateShort: dateShort(m.release_date),
});

// Query vide → 10 derniers non-vus de l'année (date desc). Saisie → filtre titre (max 5).
const localMatches = computed(() => {
    const term = debouncedQuery.value.trim().toLowerCase();
    if (!term) {
        return [...pool.value]
            .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
            .slice(0, 10)
            .map(toOption);
    }
    return pool.value
        .filter(m => (m.title || '').toLowerCase().includes(term))
        .slice(0, 5)
        .map(toOption);
});

// Fallback TMDB (max 5) uniquement quand la saisie ne matche aucun film de ma liste.
// La présence locale est recalculée directement depuis `pool` (et non via le computed
// `localMatches`) pour que le fallback se déclenche de façon fiable, sans dépendre du cache réactif.
watch(debouncedQuery, async (term) => {
    tmdbMatches.value = [];
    const q = term.trim();
    if (!showPicker.value || !q) return;
    const needle = q.toLowerCase();
    const hasLocal = pool.value.some(m => (m.title || '').toLowerCase().includes(needle));
    if (hasLocal) return;
    try {
        const data = await $fetch(`/api/movies/search?query=${encodeURIComponent(q)}`);
        tmdbMatches.value = (data?.results ?? [])
            .filter(r => !inTheatersIds.value.has(Number(r.id)))
            .slice(0, 5)
            .map(r => ({
                source: 'tmdb',
                key: `t-${r.id}`,
                movie_id: r.id,
                title: r.title,
                poster_path: r.poster_path,
                dateShort: dateShort(r.release_date),
            }));
    } catch (e) {
        console.error('Recherche TMDB fallback échouée:', e);
    }
});

const suggestions = computed(() =>
    localMatches.value.length ? localMatches.value : tmdbMatches.value
);

const selectSuggestion = (o) => {
    if (o.source === 'list') emit('toggle-catchup', o.id, true);
    else emit('add-catchup-movie', { movieId: o.movie_id, media: 'cinema', year: props.year });
    closePicker();
};

const { stripEl, atStart, atEnd, nudge, updateEdges } =
    useHorizontalStrip(() => catchup.value.length);

let pendingFocus = null;

const remove = (movie) => {
    pendingFocus = { id: movie.id, index: catchup.value.findIndex(m => m.id === movie.id) };
    emit('toggle-catchup', movie.id, false);
};

watch(catchup, async (list) => {
    if (!pendingFocus || list.some(m => m.id === pendingFocus.id)) return;
    const { index } = pendingFocus;
    pendingFocus = null;
    await nextTick();
    const cards = stripEl.value?.querySelectorAll('.cardbtn') ?? [];
    (cards[index] ?? slotBtn.value)?.focus();
});
</script>

<template>
    <section class="lists-catchup card">
        <div class="head flex -align-center">
            <h2 class="label">{{ heading }}</h2>
            <p class="count">{{ catchup.length }}<span class="sr"> film{{ catchup.length > 1 ? 's' : '' }}</span></p>
            <div class="nav flex -align-center">
                <button type="button" class="arrow -prev" aria-label="Faire défiler vers la gauche"
                        :aria-disabled="atStart" @click="nudge(-1)"><Svg name="chevron" /></button>
                <button type="button" class="arrow -next" aria-label="Faire défiler vers la droite"
                        :aria-disabled="atEnd" @click="nudge(1)"><Svg name="chevron" /></button>
            </div>
        </div>

        <ul ref="stripEl" role="list" class="strip" @scroll.passive="updateEdges">
            <li v-for="f in catchup" :key="f.id" class="cell">
                <!-- Deux boutons frères (pas d'imbrication interactive) : la carte ouvre le film,
                     le bouton retrait est superposé sur l'affiche. -->
                <div class="cardwrap">
                    <button type="button" class="cardbtn" @click="emit('go-to-movie', f.movie_id)">
                        <span class="poster">
                            <NuxtImg v-if="posterUrl(f.poster_path)" :src="posterUrl(f.poster_path)" alt=""
                                     class="img" loading="lazy" />
                            <span v-else class="img -placeholder" />
                        </span>
                        <span class="title">{{ f.title }}</span>
                    </button>
                    <button type="button" class="remove" :aria-label="`Retirer « ${f.title} » de la liste à rattraper`"
                            @click="remove(f)"><Svg name="close" aria-hidden="true" /></button>
                </div>
            </li>

            <li class="cell">
                <!-- Slot pleine hauteur d'une carte (réserve l'espace du titre, vide) pour que la
                     bande ne « saute » pas ; seule la boîte du haut (format affiche) est pointillée.
                     Un seul, toujours en dernier : la liste n'a plus de plafond. -->
                <button ref="slotBtn" type="button" class="slot" aria-haspopup="dialog" @click="openPicker">
                    <span class="box flex -direction-column -align-center -justify-center">
                        <Svg name="add" class="ico" aria-hidden="true" />
                        <span class="txt">Ajouter<span class="sr"> un film à rattraper</span></span>
                    </span>
                </button>
            </li>
        </ul>

        <ListsFilmPicker v-if="showPicker" v-model:query="query"
                         title="À rattraper" label="Ajouter un film à rattraper"
                         search-label="Rechercher un film à rattraper" :options="suggestions"
                         :return-focus="slotBtn" @select="selectSuggestion" @close="closePicker" />
    </section>
</template>

<style lang="scss" scoped>
.lists-catchup {
    background: $color-surface-1;
    border: 1px solid $color-border-2;
    border-radius: 1.6rem;
    padding: 2rem;
    min-width: 0;
    overflow: hidden;

    > .head {
        gap: 1rem;
        margin-bottom: 1.4rem;

        > .label {
            color: $color-text-quiet;
            @include label-caps;
        }

        > .count {
            color: $color-text-quiet;
            @include mono-small;
        }

        > .nav {
            margin-left: auto;
            @include stripArrows();

            > .arrow { @include focusRing; }
        }
    }

    > .strip {
        padding-bottom: .4rem;
        @include stripScroll(2rem);

        > .cell { width: 9.6rem; }
    }

    .cardwrap {
        position: relative;

        > .remove {
            position: absolute;
            top: .6rem;
            right: .6rem;
            display: grid;
            place-items: center;
            width: 2.4rem;
            height: 2.4rem;
            border-radius: 50%;
            background: rgba(0, 0, 0, .65);
            color: $color-primary-lighter;
            cursor: pointer;
            transition: opacity .18s ease;
            @include focusRing;

            > :deep(svg) { width: 1.2rem; height: 1.2rem; }
        }

        // Souris : le retrait se révèle au survol de la carte (ou au focus clavier) ; sur
        // tactile, faute de hover, il reste visible. `pointer-events: none` tant qu'il est
        // transparent — sur un hybride, la media query s'applique mais l'écran reste tactile.
        @media (hover: hover) {
            > .remove {
                opacity: 0;
                pointer-events: none;

                &:focus-visible { opacity: 1; pointer-events: auto; }
            }

            &:hover > .remove { opacity: 1; pointer-events: auto; }
        }
    }

    .cardbtn {
        display: block;
        width: 100%;
        text-align: left;
        cursor: pointer;
        border-radius: 1rem;
        @include focusRing($offset: -2px);
    }

    .poster {
        display: block;
        width: 9.6rem;
        height: 14.4rem;
        border-radius: 1rem;
        overflow: hidden;
        background: $color-surface-4;

        > .img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;

            &.-placeholder { background: linear-gradient(150deg, $color-surface-3, $color-surface-1); }
        }
    }

    .title {
        margin-top: .6rem;
        // Hauteur réservée pour 2 lignes (1.15rem × 1.25 × 2) : la carte a toujours la même
        // hauteur totale, identique à celle d'un slot « Ajouter » → pas de saut vertical quand
        // on ajoute le premier film dans une liste vide.
        height: 2.875rem;
        color: $color-text-dim;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        @include card-title;
    }

    // `relative` : borne le texte `.sr` (absolu), qui sinon s'échappe de la bande et étire la page.
    .slot {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 9.6rem;
        // = affiche (14.4) + marge titre (.6) + hauteur titre 2 lignes (2.875) : réserve la
        // hauteur totale d'une carte pour que la bande ne saute pas ; l'espace titre reste vide.
        height: 17.875rem;
        cursor: pointer;
        border-radius: 1rem;
        @include focusRing($offset: -2px);

        > .box {
            gap: .6rem;
            width: 9.6rem;
            height: 14.4rem;
            border: 1px dashed $color-border-5;
            border-radius: 1rem;
            color: $color-text-quiet;
            transition: border-color .18s ease, color .18s ease;

            > .ico { width: 1.8rem; height: 1.8rem; }
            > .txt { @include small-label; }
        }

        @media (hover: hover) {
            &:hover > .box { border-color: $color-primary; color: $color-primary-light; }
        }
    }
}

.sr { @include srOnly; }
</style>
