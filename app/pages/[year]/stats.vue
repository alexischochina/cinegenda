<script setup>
// `key: 'stats'` constant sur l'année → changer d'année réutilise l'instance et les barres de
// StatsMeter transitionnent leur largeur (pas de reset).
definePageMeta({ key: 'stats', middleware: ['auth', 'valid-year'] })
useHead({ title: 'Statistiques' })

const { movies } = useMovieCalendar()
const { selectedYear } = useCalendarNav()
</script>

<template>
    <StatsView :movies="movies" :year="selectedYear" />
</template>
