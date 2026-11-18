<script setup>
definePageMeta({ key: 'lists', middleware: ['auth', 'valid-year'] })
useHead({ title: 'Mes listes' })

const { movies, setCatchup } = useMovieCalendar()
const { selectedYear, goToMovie } = useCalendarNav()
const { onAddCatchupMovie } = useCatchupFlow()
const { togglePrio } = usePrioToggle()
</script>

<template>
    <ListsView :movies="movies" :year="selectedYear"
               @toggle-prio="togglePrio" @go-to-movie="(id) => goToMovie(id)"
               @toggle-catchup="setCatchup" @add-catchup-movie="onAddCatchupMovie" />
</template>
