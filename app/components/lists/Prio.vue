<script setup>
const props = defineProps({
    movies: { type: Array, default: () => [] },
});

const emit = defineEmits(['toggle-prio']);

const { seancesRoute } = useCalendarNav();

const prio = computed(() => sortPrio(props.movies.filter(m => m.prio))
    .map(movie => ({ ...movie, dateLabel: prioDateLabel(movie) })));

const { stripEl, atStart, atEnd, nudge, updateEdges } = useHorizontalStrip(() => prio.value.length);

const showPicker = ref(false);
const query = ref('');
const slotBtn = ref(null);

const options = computed(() => prioCandidates(props.movies, query.value).map(m => ({
    key: m.id,
    id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    dateShort: prioDateLabel(m),
})));

const openPicker = () => {
    query.value = '';
    showPicker.value = true;
};
const closePicker = () => {
    showPicker.value = false;
};
const select = (option) => {
    emit('toggle-prio', option.id, true);
    closePicker();
};

let pendingFocus = null;

const remove = (movie) => {
    pendingFocus = { id: movie.id, index: prio.value.findIndex(m => m.id === movie.id) };
    emit('toggle-prio', movie.id, false);
};

watch(prio, async (list) => {
    if (!pendingFocus || list.some(m => m.id === pendingFocus.id)) return;
    const { index } = pendingFocus;
    pendingFocus = null;
    await nextTick();
    const cards = stripEl.value?.querySelectorAll('.cardlink') ?? [];
    (cards[index] ?? slotBtn.value)?.focus();
});
</script>

<template>
    <section class="lists-prio">
        <div class="head flex -align-center">
            <Svg name="star" class="ico" aria-hidden="true" />
            <h2 class="title">Prio ciné</h2>
            <p class="count">{{ prio.length }}<span class="sr"> film{{ prio.length > 1 ? 's' : '' }}</span></p>
            <div class="nav flex -align-center">
                <button type="button" class="arrow -prev" aria-label="Faire défiler vers la gauche"
                        :aria-disabled="atStart" @click="nudge(-1)"><Svg name="chevron" /></button>
                <button type="button" class="arrow -next" aria-label="Faire défiler vers la droite"
                        :aria-disabled="atEnd" @click="nudge(1)"><Svg name="chevron" /></button>
            </div>
        </div>

        <ul ref="stripEl" role="list" class="cards" @scroll.passive="updateEdges">
            <li v-for="f in prio" :key="f.id" class="cell">
                <div class="cardwrap">
                    <NuxtLink :to="seancesRoute(f.movie_id)" class="cardlink">
                        <div class="poster">
                            <NuxtImg v-if="posterUrl(f.poster_path)" :src="posterUrl(f.poster_path)" alt=""
                                     class="img" loading="lazy" />
                            <div v-else class="img -placeholder" />
                        </div>
                        <p class="title">{{ f.title }}</p>
                        <p class="date">{{ f.dateLabel }}</p>
                        <span class="sr">, voir les séances</span>
                    </NuxtLink>
                    <button type="button" class="remove" :aria-label="`Retirer « ${f.title} » des prios`"
                            @click="remove(f)"><Svg name="close" aria-hidden="true" /></button>
                </div>
            </li>

            <li class="cell">
                <button ref="slotBtn" type="button" class="slot" aria-haspopup="dialog" @click="openPicker">
                    <span class="box flex -align-center -justify-center"><Svg name="add" class="ico" aria-hidden="true" /></span>
                    <span class="txt">Ajouter<span class="sr"> un film aux prios ciné</span></span>
                </button>
            </li>
        </ul>

        <ListsFilmPicker v-if="showPicker" v-model:query="query"
                         title="Prio ciné" label="Ajouter aux prios ciné" :count="prio.length"
                         hint="Films de ta liste en salle en ce moment."
                         search-label="Rechercher un film en salle dans ta liste" :options="options"
                         empty-text="Aucun autre film en salle dans ta liste." :return-focus="slotBtn"
                         @select="select" @close="closePicker" />
    </section>
</template>

<style lang="scss" scoped>
.lists-prio {
    background: $color-surface-1;
    border: 1px solid $color-border-2;
    border-radius: 1.6rem;
    padding: 2rem;
    min-width: 0;
    overflow: hidden;

    > .head {
        gap: 1rem;
        margin-bottom: 1.4rem;

        > .ico {
            width: 1.5rem;
            height: 1.5rem;
            flex: none;
            color: $color-prio;
        }

        > .title {
            color: $color-text-quiet;
            @include label-caps;
        }

        > .count {
            color: $color-text-muted;
            @include mono-small;
        }

        > .nav {
            display: none;
            margin-left: auto;
            @include stripArrows();

            > .arrow { @include focusRing; }
        }
    }

    > .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, 9.6rem);
        gap: 1.6rem 1.2rem;

        > .cell {
            min-width: 0;
        }
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

        @media (hover: hover) {
            > .remove {
                opacity: 0;
                pointer-events: none;
            }

            &:hover > .remove,
            &:focus-within > .remove {
                opacity: 1;
                pointer-events: auto;
            }
        }
    }

    .cardlink {
        display: block;
        border-radius: 1rem;
        @include focusRing($offset: -2px);

        > .poster {
            width: 9.6rem;
            height: 14.4rem;
            border-radius: 1rem;
            overflow: hidden;
            background: $color-surface-4;

            > .img {
                width: 100%;
                height: 100%;
                object-fit: cover;

                &.-placeholder { background: linear-gradient(150deg, $color-surface-3, $color-surface-1); }
            }
        }

        > .title {
            margin-top: .6rem;
            color: $color-text-dim;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            @include card-title;
        }

        > .date {
            color: $color-text-muted;
            @include mono-caption;
        }

        @media (hover: hover) {
            &:hover > .title { color: $color-text; }
        }
    }

    // `relative` : borne le texte `.sr` (absolu), qui sinon s'échappe de la bande et étire la page.
    .slot {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 9.6rem;
        text-align: left;
        cursor: pointer;
        border-radius: 1rem;
        @include focusRing($offset: -2px);

        > .box {
            width: 9.6rem;
            height: 14.4rem;
            border: 1.5px dashed $color-status-grey;
            border-radius: 1rem;
            background: $color-surface-4;
            color: $color-text-muted;
            transition: border-color .18s ease, color .18s ease;

            > .ico { width: 2.2rem; height: 2.2rem; }
        }

        > .txt {
            margin-top: .6rem;
            color: $color-text-muted;
            @include small-label;
        }

        @media (hover: hover) {
            &:hover > .box { border-color: $color-prio; color: $color-prio; }
        }
    }

    .sr { @include srOnly; }

    @media #{$mobile} {
        > .head {
            > .nav {
                display: flex;
            }
        }

        > .cards {
            padding-bottom: .4rem;
            @include stripScroll(2rem);

            > .cell {
                width: 9.6rem;
            }
        }
    }
}
</style>
