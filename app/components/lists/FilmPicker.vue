<script setup>
const props = defineProps({
    title: { type: String, required: true },
    label: { type: String, required: true },
    count: { type: Number, default: null },
    hint: { type: String, default: '' },
    options: { type: Array, default: () => [] },
    emptyText: { type: String, default: 'Aucun résultat.' },
    searchLabel: { type: String, required: true },
    // À fournir : Safari ne donne pas le focus à un bouton cliqué (`activeElement` vaudrait `<body>`).
    returnFocus: { type: null, default: null },
});

const emit = defineEmits(['select', 'close']);
const query = defineModel('query', { type: String, default: '' });

const rootEl = ref(null);
const modalEl = ref(null);
const input = ref(null);

const lastFocused = import.meta.client ? document.activeElement : null;
let restoreInert = null;

const onKeydown = (e) => {
    if (e.key === 'Escape') { emit('close'); return; }
    if (e.key !== 'Tab' || !modalEl.value) return;
    const focusables = modalEl.value.querySelectorAll(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
};

onMounted(() => {
    window.addEventListener('keydown', onKeydown);
    restoreInert = inertOutside(rootEl.value);
    input.value?.focus();
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
    restoreInert?.();
    restoreInert = null;
    (props.returnFocus ?? lastFocused)?.focus?.();
});
</script>

<template>
    <div ref="rootEl" class="film-picker flex -justify-center" @click="emit('close')">
        <div ref="modalEl" class="modal flex -direction-column" :class="{ '-hinted': hint }"
             role="dialog" aria-modal="true" :aria-label="label" @click.stop>
            <div class="mhead flex -align-center">
                <h2 class="mtitle">{{ title }}</h2>
                <p v-if="count !== null" class="mcount">{{ count }}<span class="sr"> film{{ count > 1 ? 's' : '' }}</span></p>
                <button type="button" class="close" aria-label="Fermer" @click="emit('close')"><Svg name="close" /></button>
            </div>
            <p v-if="hint" class="hint">{{ hint }}</p>
            <input ref="input" v-model="query" type="text" class="search input-body"
                   placeholder="Rechercher un film…" :aria-label="searchLabel" autocomplete="off" />
            <div class="options">
                <ul v-if="options.length" role="list">
                    <li v-for="o in options" :key="o.key">
                        <button type="button" class="option flex -align-center" @click="emit('select', o)">
                            <NuxtImg v-if="posterUrl(o.poster_path)" :src="posterUrl(o.poster_path)" alt=""
                                     class="mini" loading="lazy" />
                            <span v-else class="mini -placeholder" />
                            <span class="meta">
                                <span class="otitle">{{ o.title }}</span>
                                <span class="odate">{{ o.dateShort }}</span>
                            </span>
                        </button>
                    </li>
                </ul>
                <p v-else class="empty">{{ emptyText }}</p>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.film-picker {
    position: fixed;
    inset: 0;
    z-index: 40;
    // Ancrée en haut (pas de centrage vertical) : le champ de recherche garde une
    // position fixe quel que soit le nombre de suggestions.
    align-items: flex-start;
    padding: 8vh 2rem 2rem;
    background: rgba(0, 0, 0, .6);

    > .modal {
        width: 42rem;
        max-width: 100%;
        max-height: calc(92vh - 2rem);
        padding: 2rem;
        background: $color-surface-1;
        border: 1px solid $color-border-4;
        border-radius: 2rem;
        box-shadow: 0 30px 70px rgba(0, 0, 0, .6);

        @media (prefers-reduced-motion: no-preference) {
            animation: picker-pop .18s ease;
        }

        > .mhead {
            gap: 1rem;
            margin-bottom: 1.4rem;

            // `h2` : le `letter-spacing` global des titres (`title-2`) survivrait au raccourci `font`.
            > .mtitle {
                color: $color-text;
                letter-spacing: normal;
                @include dialog-title;
            }

            > .mcount { color: $color-text-muted; @include mono-small; }

            > .close {
                display: grid;
                place-items: center;
                margin-left: auto;
                color: $color-text-muted;
                cursor: pointer;
                @include focusRing;

                > :deep(svg) { width: 2rem; height: 2rem; }
            }
        }

        &.-hinted > .mhead { margin-bottom: .8rem; }

        > .hint {
            margin-bottom: 1.6rem;
            color: $color-text-muted;
            @include small-text;
        }

        > .search {
            width: 100%;
            padding: 1rem 1.2rem;
            background: $color-surface-4;
            border: 1px solid $color-border-3;
            border-radius: 1.2rem;
            color: $color-text-body;
            margin-bottom: 1.2rem;
            @include focusRing;
        }

        > .options {
            min-height: 0;
            overflow-y: auto;
            overscroll-behavior: contain;

            .option {
                gap: 1.1rem;
                width: 100%;
                padding: .7rem .9rem;
                border-radius: 1.1rem;
                text-align: left;
                cursor: pointer;
                transition: background .18s ease;
                @include focusRing($offset: -2px);

                > .mini {
                    width: 3.2rem;
                    height: 4.8rem;
                    flex: none;
                    border-radius: .5rem;
                    object-fit: cover;

                    &.-placeholder { background: $color-surface-4; }
                }

                > .meta {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: .2rem;

                    > .otitle {
                        color: $color-text-body;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        @include item-title;
                    }

                    > .odate { color: $color-text-quiet; @include mono-caption; }
                }

                @media (hover: hover) {
                    &:hover { background: rgba(255, 255, 255, .04); }
                }
            }

            > .empty {
                padding: 2rem 0;
                text-align: center;
                color: $color-text-quiet;
                @include small-text;
            }
        }
    }
}

.sr { @include srOnly; }

@keyframes picker-pop {
    from { transform: scale(.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
</style>
