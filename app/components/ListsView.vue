<script setup>
defineProps({
    movies: { type: Array, default: () => [] },
    year: { type: [Number, null], default: null },
});

const emit = defineEmits(['toggle-prio', 'go-to-movie', 'toggle-catchup', 'add-catchup-movie']);
</script>

<template>
    <div class="lists-view scr">
        <div class="head">
            <h1 class="title">Mes listes</h1>
        </div>

        <div class="blocks">
            <ListsPrio :movies="movies" @toggle-prio="(id, value) => emit('toggle-prio', id, value)" />

            <ClientOnly>
                <ListsTopRated :movies="movies" :year="year" />
                <ListsCatchup :movies="movies" :year="year"
                              @go-to-movie="emit('go-to-movie', $event)"
                              @toggle-catchup="(id, value) => emit('toggle-catchup', id, value)"
                              @add-catchup-movie="emit('add-catchup-movie', $event)" />
            </ClientOnly>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.lists-view {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1.6rem 2.4rem 11rem;

    > .head {
        margin-bottom: 2rem;

        > .title {
            color: $color-text;
            font: 800 2.6rem/1 $font-title;
            letter-spacing: -.06rem;
        }
    }

    > .blocks {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 1.6rem;
    }

    @media #{$shell-compact} {
        padding: 1.4rem 1.4rem 11rem;
    }
}
</style>
