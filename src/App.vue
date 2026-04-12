<template>
  <div id="app">
    <div class="global-watermark" aria-hidden="true">
      <div
        class="global-watermark-canvas"
        :style="{ gridTemplateColumns: `repeat(${watermarkCols}, 80mm)` }"
      >
        <span
          v-for="n in watermarkCount"
          :key="`wm-${n}`"
          class="global-watermark-text"
        >FINECHEM 方恩电子</span>
      </div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      watermarkCols: 12,
      watermarkRows: 10
    }
  },
  computed: {
    watermarkCount() {
      return this.watermarkCols * this.watermarkRows
    }
  },
  mounted() {
    this.updateWatermarkGrid()
    window.addEventListener('resize', this.updateWatermarkGrid)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateWatermarkGrid)
  },
  methods: {
    updateWatermarkGrid() {
      const pxToMm = 0.264583
      const canvasWidthMm = window.innerWidth * 1.8 * pxToMm
      const canvasHeightMm = window.innerHeight * 1.8 * pxToMm
      this.watermarkCols = Math.max(10, Math.ceil(canvasWidthMm / 80) + 3)
      this.watermarkRows = Math.max(14, Math.ceil(canvasHeightMm / 40) + 3)
    }
  }
}
</script>

<style>
.global-watermark {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.global-watermark-canvas {
  position: absolute;
  left: -40vw;
  top: -40vh;
  width: 180vw;
  height: 180vh;
  display: grid;
  grid-auto-rows: 40mm;
  justify-content: start;
  align-content: start;
  transform: rotate(-30deg);
  transform-origin: center;
  opacity: 0.12;
}

.global-watermark-text {
  align-self: center;
  justify-self: center;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  font-size: 5mm;
  font-weight: 700;
  letter-spacing: 0.4mm;
  color: #9c9c9c;
  line-height: 1;
  opacity: 0.5;
  white-space: nowrap;
  border: none;
  user-select: none;
}

@media print {
  .global-watermark {
    display: none !important;
  }
}
</style>
