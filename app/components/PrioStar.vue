<template>
    <span class="prio-star" role="img" aria-label="Prio ciné"><Svg name="star" aria-hidden="true" /></span>
</template>

<style lang="scss" scoped>
.prio-star {
    display: inline-flex;
    flex: none;
    width: 1em;
    height: 1em;
    color: $color-prio;

    > :deep(svg) {
        width: 100%;
        height: 100%;
    }
}
</style>
