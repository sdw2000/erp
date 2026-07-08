const { getToken, getUserInfo, clearToken } = require('../../utils/auth')
const request = require('../../utils/request')

Page({
  data: {
    userName: '',

    // 画布真实像素尺寸（用于避免仅设置样式尺寸导致绘图被裁剪）
    canvasWidthPx: 300,
    canvasHeightPx: 250,
    canvasHeightSimPx: 170,
    canvasHeightRpx: 360,
    canvasHeightSimRpx: 220,

    // 工具1：直径/长度换算
    t1ThicknessUm: '',
    t1CoreMm: '76.2',
    t1OuterMm: '',
    t1LengthM: '',
    t1Result: '',

    // 工具2：纸箱装箱与重量
    t2CartonL: '',
    t2CartonW: '',
    t2CartonH: '',
    t2OuterMm: '',
    t2TapeThicknessUm: '',
    t2TapeWidthMm: '',
    t2TapeLengthM: '',
    t2PerRollKg: '',
    t2BaseThicknessUm: '',
    t2BaseMaterialId: '',
    t2AdhesiveThicknessUm: '',
    t2AdhesiveMaterialId: '',
    t2CoreOuterMm: '76.2',
    t2CoreWallMm: '6',
    t2CoreMaterialId: '',
    t2BaseMaterialText: '',
    t2AdhesiveMaterialText: '',
    t2CoreMaterialText: '',
    t2Result: null,
    t2CanvasDebug: '',

    // 常用材质密度库（后端优先，失败回退本地）
    materialLibrary: [],
    materialPickerRange: [],
    matFormVisible: false,
    matFormEditingId: '',
    matFormEnName: '',
    matFormCnName: '',
    matFormDensity: '',
    matFormRemark: '',

    // 工具3：每卷重量与每箱重量估算
    t3ThicknessUm: '',
    t3WidthMm: '',
    t3LengthM: '',
    t3Density: '0.95',
    t3QtyPerBox: '',
    t3CartonVolumeL: '',
    t3PackEfficiency: '0.78',
    t3OuterMm: '',
    t3RollWidthMm: '',
    t3Result: null,

    showCalcModal: false
  },

  onShow() {
    const token = getToken()
    if (!token) {
      wx.reLaunch({ url: '/pages/login/index' })
      return
    }
    const userInfo = getUserInfo() || {}
    this.setData({ userName: userInfo.name || userInfo.username || '' })
  },

  onLoad() {
    const info = wx.getSystemInfoSync()
    const rpxToPx = (rpx) => Math.max(1, Math.floor((info.windowWidth * rpx) / 750))
    const pxToRpx = (px) => Math.max(1, Math.round((px * 750) / info.windowWidth))
    const packH = rpxToPx(360)
    const sideH = rpxToPx(220)
    this.setData({
      canvasWidthPx: rpxToPx(640),
      canvasHeightPx: packH,
      canvasHeightSimPx: sideH,
      canvasHeightRpx: pxToRpx(packH),
      canvasHeightSimRpx: pxToRpx(sideH)
    })

    this.initMaterialLibrary()
  },

  goReport() { wx.switchTab({ url: '/pages/report/index' }) },
  goWarehouse() { wx.switchTab({ url: '/pages/warehouse/index' }) },
  goSales() { wx.switchTab({ url: '/pages/sales/index' }) },
  goDashboard() { wx.navigateTo({ url: '/pages/dashboard/index' }) },
  goQC() { wx.navigateTo({ url: '/pages/qc/index' }) },
  goPallet() { wx.navigateTo({ url: '/pages/stocktake/index' }) },
  goTransfer() { wx.showToast({ title: '班组交接开发中', icon: 'none' }) },

  showCalculators() {
    this.setData({ showCalcModal: true })
  },

  hideCalculators() {
    this.setData({ showCalcModal: false })
  },
  goReturn() { wx.navigateTo({ url: '/pages/issue/index' }) },

  logout() {
    clearToken()
    wx.reLaunch({ url: '/pages/login/index' })
  },

  onInput(e) {
    const key = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key) || ''
    if (!key) return
    this.setData({ [key]: (e.detail && e.detail.value) || '' }, () => {
      if (key.indexOf('t2') === 0) {
        this.refreshT2Derived()
      }
    })
  },

  toNum(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : NaN
  },

  getDefaultMaterialLibrary() {
    return [
      { id: 'mat_bopp', enName: 'BOPP', cnName: '双向拉伸聚丙烯', density: 0.91, remark: '常见基材薄膜' },
      { id: 'mat_pet', enName: 'PET', cnName: '聚酯', density: 1.38, remark: '高强度基材' },
      { id: 'mat_pp', enName: 'PP', cnName: '聚丙烯', density: 0.90, remark: '通用聚丙烯' },
      { id: 'mat_pe', enName: 'PE', cnName: '聚乙烯', density: 0.92, remark: '通用聚乙烯' },
      { id: 'mat_pvc', enName: 'PVC', cnName: '聚氯乙烯', density: 1.35, remark: '电工胶带常见基材' },
      { id: 'mat_pu', enName: 'PU', cnName: '聚氨酯', density: 1.20, remark: '弹性体基材' },
      { id: 'mat_ps', enName: 'PS', cnName: '聚苯乙烯', density: 1.05, remark: '常见塑料材质' },
      { id: 'mat_pi', enName: 'PI', cnName: '聚酰亚胺', density: 1.42, remark: '耐高温薄膜材质' },
      { id: 'mat_acrylic', enName: 'Acrylic', cnName: '丙烯酸胶', density: 1.02, remark: '常见压敏胶' },
      { id: 'mat_silicone', enName: 'Silicone', cnName: '硅胶', density: 1.10, remark: '硅胶系胶黏剂' },
      { id: 'mat_rubber', enName: 'Rubber', cnName: '橡胶胶层', density: 0.98, remark: '橡胶系胶黏剂' },
      { id: 'mat_paper', enName: 'Paper', cnName: '纸', density: 0.80, remark: '通用纸类经验值' },
      { id: 'mat_glassine', enName: 'Glassine Paper', cnName: '格拉辛纸', density: 0.95, remark: '离型纸常见材质' },
      { id: 'mat_paper_core', enName: 'Paper Core', cnName: '纸管', density: 0.72, remark: '普通纸管经验值' }
    ]
  },

  saveMaterialLibraryToLocal(lib) {
    wx.setStorageSync('mes_material_density_library', lib)
  },

  normalizeMaterialFromServer(row) {
    if (!row) return null
    return {
      id: row.id,
      enName: row.materialEnName,
      cnName: row.materialCnName,
      density: Number(row.density),
      remark: row.remark || ''
    }
  },

  mapMaterialToServerPayload(localRow) {
    return {
      id: localRow.id,
      materialEnName: (localRow.enName || '').trim(),
      materialCnName: (localRow.cnName || '').trim(),
      density: Number(localRow.density),
      remark: (localRow.remark || '').trim(),
      isActive: 1
    }
  },

  fetchMaterialLibraryFromServer() {
    return request({
      url: '/api/rd/material-density/list',
      method: 'GET'
    }).then((res) => {
      const rows = (res && res.data) || []
      return Array.isArray(rows)
        ? rows.map((r) => this.normalizeMaterialFromServer(r)).filter(Boolean)
        : []
    })
  },

  initMaterialLibrary() {
    this.fetchMaterialLibraryFromServer()
      .then((serverLib) => {
        const lib = (Array.isArray(serverLib) && serverLib.length > 0)
          ? serverLib
          : this.getDefaultMaterialLibrary()
        this.saveMaterialLibraryToLocal(lib)
        this.applyMaterialLibrary(lib)
      })
      .catch(() => {
        let lib = wx.getStorageSync('mes_material_density_library')
        if (!Array.isArray(lib) || lib.length === 0) {
          lib = this.getDefaultMaterialLibrary()
          this.saveMaterialLibraryToLocal(lib)
        }
        this.applyMaterialLibrary(lib)
      })
  },

  applyMaterialLibrary(lib) {
    const range = lib.map((m) => `${m.enName} / ${m.cnName} (${m.density} g/cm³)`)
    const findIdByCn = (name) => {
      const hit = lib.find((m) => (m.cnName || '').indexOf(name) >= 0)
      return hit ? hit.id : (lib[0] ? lib[0].id : '')
    }
    const ensureValid = (id, fallback) => {
      if (!id) return fallback
      const ok = lib.some((m) => String(m.id) === String(id))
      return ok ? id : fallback
    }
    const baseFallback = findIdByCn('聚丙烯')
    const glueFallback = findIdByCn('丙烯酸')
    const coreFallback = findIdByCn('纸管')

    this.setData({
      materialLibrary: lib,
      materialPickerRange: range,
      t2BaseMaterialId: ensureValid(this.data.t2BaseMaterialId, baseFallback),
      t2AdhesiveMaterialId: ensureValid(this.data.t2AdhesiveMaterialId, glueFallback),
      t2CoreMaterialId: ensureValid(this.data.t2CoreMaterialId, coreFallback)
    }, () => {
      this.syncT2MaterialTexts()
      this.refreshT2Derived()
    })
  },

  syncT2MaterialTexts() {
    const getText = (id) => {
      const m = this.getMaterialById(id)
      return m ? `${m.enName} / ${m.cnName} (${m.density} g/cm³)` : ''
    }
    this.setData({
      t2BaseMaterialText: getText(this.data.t2BaseMaterialId),
      t2AdhesiveMaterialText: getText(this.data.t2AdhesiveMaterialId),
      t2CoreMaterialText: getText(this.data.t2CoreMaterialId)
    })
  },

  getMaterialById(id) {
    return (this.data.materialLibrary || []).find((m) => String(m.id) === String(id)) || null
  },

  getMaterialDensityById(id) {
    const m = this.getMaterialById(id)
    const d = m ? Number(m.density) : NaN
    return Number.isFinite(d) ? d : NaN
  },

  getMaterialDisplayById(id) {
    const m = this.getMaterialById(id)
    return m ? `${m.enName}/${m.cnName}` : '-'
  },

  onMaterialPick(e) {
    const key = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key) || ''
    if (!key) return
    const idx = Number((e.detail && e.detail.value) || 0)
    const lib = this.data.materialLibrary || []
    if (!(idx >= 0) || !lib[idx]) return
    this.setData({ [key]: lib[idx].id }, () => {
      this.syncT2MaterialTexts()
      this.refreshT2Derived()
    })
  },

  refreshT2Derived() {
    const baseT = this.toNum(this.data.t2BaseThicknessUm)
    const glueT = this.toNum(this.data.t2AdhesiveThicknessUm)
    const totalT = (baseT > 0 ? baseT : 0) + (glueT > 0 ? glueT : 0)
    const coreOuter = this.toNum(this.data.t2CoreOuterMm)
    const len = this.toNum(this.data.t2TapeLengthM)
    const D = this.calcOuterDiameterMm(totalT, coreOuter, len)
    const next = {}
    next.t2TapeThicknessUm = totalT > 0 ? totalT.toFixed(1) : ''
    next.t2OuterMm = (D > coreOuter) ? D.toFixed(2) : ''
    this.setData(next)
  },

  startAddMaterial() {
    this.setData({
      matFormVisible: true,
      matFormEditingId: '',
      matFormEnName: '',
      matFormCnName: '',
      matFormDensity: '',
      matFormRemark: ''
    })
  },

  startEditMaterial(e) {
    const id = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || ''
    const m = this.getMaterialById(id)
    if (!m) return
    this.setData({
      matFormVisible: true,
      matFormEditingId: m.id,
      matFormEnName: m.enName || '',
      matFormCnName: m.cnName || '',
      matFormDensity: String(m.density || ''),
      matFormRemark: m.remark || ''
    })
  },

  cancelMaterialForm() {
    this.setData({ matFormVisible: false })
  },

  onMaterialFormInput(e) {
    const key = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key) || ''
    if (!key) return
    this.setData({ [key]: (e.detail && e.detail.value) || '' })
  },

  saveMaterialForm() {
    const enName = (this.data.matFormEnName || '').trim()
    const cnName = (this.data.matFormCnName || '').trim()
    const density = this.toNum(this.data.matFormDensity)
    const remark = (this.data.matFormRemark || '').trim()
    if (!enName || !cnName || !(density > 0)) {
      wx.showToast({ title: '请填写英文名/中文名/密度', icon: 'none' })
      return
    }

    const lib = [...(this.data.materialLibrary || [])]
    const editId = this.data.matFormEditingId
    const localPayload = {
      id: editId || undefined,
      enName,
      cnName,
      density: Number(density.toFixed(4)),
      remark
    }

    const req = editId
      ? request({ url: '/api/rd/material-density', method: 'PUT', data: this.mapMaterialToServerPayload(localPayload) })
      : request({ url: '/api/rd/material-density', method: 'POST', data: this.mapMaterialToServerPayload(localPayload) })

    req.then(() => this.fetchMaterialLibraryFromServer())
      .then((serverLib) => {
        const nextLib = (Array.isArray(serverLib) && serverLib.length > 0) ? serverLib : lib
        this.saveMaterialLibraryToLocal(nextLib)
        this.setData({ matFormVisible: false }, () => {
          this.applyMaterialLibrary(nextLib)
          wx.showToast({ title: '保存成功', icon: 'success' })
        })
      })
      .catch(() => {
        // 后端不可用时回退本地
        if (editId) {
          const idx = lib.findIndex((m) => String(m.id) === String(editId))
          if (idx >= 0) {
            lib[idx] = { ...lib[idx], enName, cnName, density: Number(density.toFixed(4)), remark }
          }
        } else {
          lib.push({
            id: `mat_${Date.now()}`,
            enName,
            cnName,
            density: Number(density.toFixed(4)),
            remark
          })
        }
        this.saveMaterialLibraryToLocal(lib)
        this.setData({ matFormVisible: false }, () => {
          this.applyMaterialLibrary(lib)
          wx.showToast({ title: '已保存到本地', icon: 'none' })
        })
      })
  },

  removeMaterial(e) {
    const id = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || ''
    if (!id) return
    const inUse = [this.data.t2BaseMaterialId, this.data.t2AdhesiveMaterialId, this.data.t2CoreMaterialId]
      .map((v) => String(v))
      .includes(String(id))
    if (inUse) {
      wx.showToast({ title: '该材质正在被工具2使用，请先切换', icon: 'none' })
      return
    }

    request({ url: `/api/rd/material-density/${id}`, method: 'DELETE' })
      .then(() => this.fetchMaterialLibraryFromServer())
      .then((serverLib) => {
        const nextLib = Array.isArray(serverLib) ? serverLib : []
        this.saveMaterialLibraryToLocal(nextLib)
        this.applyMaterialLibrary(nextLib)
        wx.showToast({ title: '删除成功', icon: 'success' })
      })
      .catch(() => {
        const lib = (this.data.materialLibrary || []).filter((m) => String(m.id) !== String(id))
        this.saveMaterialLibraryToLocal(lib)
        this.applyMaterialLibrary(lib)
        wx.showToast({ title: '后端不可用，已本地删除', icon: 'none' })
      })
  },

  calcLengthFromDiameter() {
    const tUm = this.toNum(this.data.t1ThicknessUm)
    const d = this.toNum(this.data.t1CoreMm)
    const D = this.toNum(this.data.t1OuterMm)
    if (!(tUm > 0) || !(d > 0) || !(D > d)) {
      wx.showToast({ title: '请输入有效参数(外径>纸管径)', icon: 'none' })
      return
    }
    const tMm = tUm / 1000
    const Lmm = Math.PI * (D * D - d * d) / (4 * tMm)
    const Lm = Lmm / 1000
    this.setData({
      t1LengthM: Lm.toFixed(2),
      t1Result: `长度≈${Lm.toFixed(2)} m`
    })
  },

  calcDiameterFromLength() {
    const tUm = this.toNum(this.data.t1ThicknessUm)
    const d = this.toNum(this.data.t1CoreMm)
    const Lm = this.toNum(this.data.t1LengthM)
    if (!(tUm > 0) || !(d > 0) || !(Lm > 0)) {
      wx.showToast({ title: '请输入有效参数', icon: 'none' })
      return
    }
    const tMm = tUm / 1000
    const Lmm = Lm * 1000
    const D = Math.sqrt(d * d + (4 * tMm * Lmm) / Math.PI)
    this.setData({
      t1OuterMm: D.toFixed(2),
      t1Result: `外径≈${D.toFixed(2)} mm`
    })
  },

  calcRollWeightKg(thicknessUm, widthMm, lengthM, density) {
    if (!(thicknessUm > 0) || !(widthMm > 0) || !(lengthM > 0) || !(density > 0)) return NaN
    const volumeCm3 = (lengthM * 100) * (widthMm / 10) * (thicknessUm / 10000)
    const grams = volumeCm3 * density
    return grams / 1000
  },

  calcOuterDiameterMm(thicknessUm, coreMm, lengthM) {
    if (!(thicknessUm > 0) || !(coreMm > 0) || !(lengthM > 0)) return NaN
    const tMm = thicknessUm / 1000
    const Lmm = lengthM * 1000
    return Math.sqrt(coreMm * coreMm + (4 * tMm * Lmm) / Math.PI)
  },

  calcPacking() {
    const L = this.toNum(this.data.t2CartonL)
    const W = this.toNum(this.data.t2CartonW)
    const H = this.toNum(this.data.t2CartonH)
    const baseT = this.toNum(this.data.t2BaseThicknessUm)
    const glueT = this.toNum(this.data.t2AdhesiveThicknessUm)
    const totalT = (baseT > 0 ? baseT : 0) + (glueT > 0 ? glueT : 0)
    const coreOuterMm = this.toNum(this.data.t2CoreOuterMm)
    const coreWallMm = this.toNum(this.data.t2CoreWallMm)
    const lengthM = this.toNum(this.data.t2TapeLengthM)
    const rollW = this.toNum(this.data.t2TapeWidthMm)
    const coreInnerMm = coreOuterMm - 2 * coreWallMm

    const D = this.calcOuterDiameterMm(totalT, coreOuterMm, lengthM)

    if (!(L > 0) || !(W > 0) || !(H > 0) || !(rollW > 0)) {
      wx.showToast({ title: '请填写纸箱尺寸和胶带宽度', icon: 'none' })
      return
    }
    if (!(baseT > 0) || !(glueT >= 0) || !(totalT > 0) || !(lengthM > 0)) {
      wx.showToast({ title: '请填写基材厚度、胶厚、长度', icon: 'none' })
      return
    }
    if (!(coreOuterMm > 0) || !(coreWallMm > 0) || !(coreInnerMm > 0) || !(D > coreOuterMm)) {
      wx.showToast({ title: '请检查管芯外径/壁厚参数', icon: 'none' })
      return
    }

    const xCount = Math.floor(L / D)
    const yCount = Math.floor(W / D)
    const layers = Math.floor(H / rollW)
    const perLayer = Math.max(0, xCount * yCount)
    const total = Math.max(0, perLayer * layers)
    const baseUtilizationPct = (L > 0 && W > 0)
      ? ((perLayer * Math.PI * D * D / 4) / (L * W) * 100)
      : NaN
    const heightUtilizationPct = (H > 0)
      ? ((layers * rollW) / H * 100)
      : NaN

    const baseDensity = this.getMaterialDensityById(this.data.t2BaseMaterialId)
    const adhesiveDensity = this.getMaterialDensityById(this.data.t2AdhesiveMaterialId)
    const coreDensity = this.getMaterialDensityById(this.data.t2CoreMaterialId)

    const baseKg = this.calcRollWeightKg(baseT, rollW, lengthM, baseDensity)
    const adhesiveKg = this.calcRollWeightKg(glueT, rollW, lengthM, adhesiveDensity)
    const coreVolumeCm3 = (Math.PI / 4)
      * Math.pow(coreOuterMm / 10, 2)
      * (rollW / 10)
      - (Math.PI / 4)
      * Math.pow(coreInnerMm / 10, 2)
      * (rollW / 10)
    const coreKg = (coreVolumeCm3 > 0 && coreDensity > 0) ? (coreVolumeCm3 * coreDensity / 1000) : NaN

    let perRollKg = this.toNum(this.data.t2PerRollKg)
    if (!(perRollKg > 0)) {
      perRollKg = (Number.isFinite(baseKg) ? baseKg : 0)
        + (Number.isFinite(adhesiveKg) ? adhesiveKg : 0)
        + (Number.isFinite(coreKg) ? coreKg : 0)
    }
    const cartonWeightKg = perRollKg > 0 ? perRollKg * total : NaN

    const cw = this.data.canvasWidthPx || 300
    const info = wx.getSystemInfoSync()
    const pxToRpx = (px) => Math.max(1, Math.round((px * 750) / info.windowWidth))
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
    const edgePad = 10
    const nextCanvasHeightPx = clamp(
      Math.round(cw * (W / Math.max(1, L)) + edgePad * 2),
      120,
      300
    )
    const nextHeightSimPx = clamp(
      Math.round(cw * (H / Math.max(1, W)) + edgePad * 2),
      110,
      240
    )

    this.setData({
      canvasHeightPx: nextCanvasHeightPx,
      canvasHeightSimPx: nextHeightSimPx,
      canvasHeightRpx: pxToRpx(nextCanvasHeightPx),
      canvasHeightSimRpx: pxToRpx(nextHeightSimPx),
      t2Result: {
        xCount,
        yCount,
        layers,
        perLayer,
        total,
        formula: `${xCount} × ${yCount} × ${layers}`,
        outerMm: D.toFixed(2),
        tapeThicknessUm: totalT.toFixed(1),
        baseMaterial: this.getMaterialDisplayById(this.data.t2BaseMaterialId),
        adhesiveMaterial: this.getMaterialDisplayById(this.data.t2AdhesiveMaterialId),
        coreMaterial: this.getMaterialDisplayById(this.data.t2CoreMaterialId),
        baseWeightKg: Number.isFinite(baseKg) ? baseKg.toFixed(3) : '-',
        adhesiveWeightKg: Number.isFinite(adhesiveKg) ? adhesiveKg.toFixed(3) : '-',
        coreWeightKg: Number.isFinite(coreKg) ? coreKg.toFixed(3) : '-',
        baseUtilizationPct: Number.isFinite(baseUtilizationPct) ? baseUtilizationPct.toFixed(1) : '-',
        heightUtilizationPct: Number.isFinite(heightUtilizationPct) ? heightUtilizationPct.toFixed(1) : '-',
        perRollKg: perRollKg > 0 ? perRollKg.toFixed(3) : '-',
        cartonWeightKg: cartonWeightKg > 0 ? cartonWeightKg.toFixed(2) : '-'
      },
      t2OuterMm: D.toFixed(2)
    }, () => {
      // 等尺寸数据与样式都更新后再绘图，避免出现拉伸和大面积留白
      this.drawPackingSketch({
        xCount,
        yCount,
        cartonL: L,
        cartonW: W,
        rollOuter: D
      })

      this.drawHeightSketch({
        yCount,
        layers,
        cartonW: W,
        cartonH: H,
        rollOuter: D,
        rollWidth: rollW
      })
    })
  },

  drawHeightSketch(layout) {
    const doDraw = () => {
      const cw = this.data.canvasWidthPx || 640
      const ch = this.data.canvasHeightSimPx || 300
      const yCount = layout.yCount || 0
      const layers = layout.layers || 0
      const W = layout.cartonW || 0
      const H = layout.cartonH || 0
      const D = layout.rollOuter || 0
      const rollW = layout.rollWidth || 0

      const drawLegacy = () => {
        const ctx = wx.createCanvasContext('heightCanvas')
        const margin = Math.max(2, Math.floor(cw * 0.015))
        const availW = cw - margin * 2
        const availH = ch - margin * 2
        const scale = Math.min(availW / Math.max(1, W), availH / Math.max(1, H))

        const boxW = W * scale
        const boxH = H * scale
        const boxX = margin + (availW - boxW) / 2
        const boxY = margin + (availH - boxH) / 2
        const rollPxW = Math.max(1, D * scale)
        const rollPxH = Math.max(1, rollW * scale)
        const startX = boxX + (boxW - yCount * rollPxW) / 2
        const startY = boxY + boxH - rollPxH

        ctx.clearRect(0, 0, cw, ch)
        ctx.setFillStyle('#ffffff')
        ctx.fillRect(0, 0, cw, ch)

        const depth = Math.max(4, Math.min(12, Math.floor(Math.min(boxW, boxH) * 0.08)))
        // 箱体顶面
        ctx.setFillStyle('#f8fafc')
        ctx.beginPath()
        ctx.moveTo(boxX, boxY)
        ctx.lineTo(boxX + depth, boxY - depth)
        ctx.lineTo(boxX + boxW + depth, boxY - depth)
        ctx.lineTo(boxX + boxW, boxY)
        ctx.closePath()
        ctx.fill()
        // 箱体右侧面
        ctx.setFillStyle('#eef2f7')
        ctx.beginPath()
        ctx.moveTo(boxX + boxW, boxY)
        ctx.lineTo(boxX + boxW + depth, boxY - depth)
        ctx.lineTo(boxX + boxW + depth, boxY + boxH - depth)
        ctx.lineTo(boxX + boxW, boxY + boxH)
        ctx.closePath()
        ctx.fill()

        ctx.setStrokeStyle('#94a3b8')
        ctx.setLineWidth(2)
        ctx.strokeRect(boxX, boxY, boxW, boxH)

        const fillPalette = ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#5eead4']
        const sidePalette = ['#60a5fa', '#4ade80', '#f59e0b', '#f87171', '#a78bfa', '#2dd4bf']
        const strokePalette = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0f766e']

        for (let ly = 0; ly < layers; ly += 1) {
          for (let xi = 0; xi < yCount; xi += 1) {
            const x = startX + xi * rollPxW
            const y = startY - ly * rollPxH
            const idx = (ly + xi) % fillPalette.length
            const d = Math.max(2, Math.min(7, Math.floor(Math.min(rollPxW, rollPxH) * 0.18)))

            // 阴影
            ctx.setFillStyle('rgba(15,23,42,0.12)')
            ctx.fillRect(x + d * 0.6, y + d * 0.6, rollPxW, rollPxH)

            // 正面
            ctx.setFillStyle(fillPalette[idx])
            ctx.setStrokeStyle(strokePalette[idx])
            ctx.setLineWidth(1.2)
            ctx.fillRect(x, y, rollPxW, rollPxH)
            ctx.strokeRect(x, y, rollPxW, rollPxH)

            // 顶面
            ctx.setFillStyle('#f8fafc')
            ctx.beginPath()
            ctx.moveTo(x, y)
            ctx.lineTo(x + d, y - d)
            ctx.lineTo(x + rollPxW + d, y - d)
            ctx.lineTo(x + rollPxW, y)
            ctx.closePath()
            ctx.fill()

            // 侧面
            ctx.setFillStyle(sidePalette[idx])
            ctx.beginPath()
            ctx.moveTo(x + rollPxW, y)
            ctx.lineTo(x + rollPxW + d, y - d)
            ctx.lineTo(x + rollPxW + d, y + rollPxH - d)
            ctx.lineTo(x + rollPxW, y + rollPxH)
            ctx.closePath()
            ctx.fill()

            // 高光线
            ctx.setStrokeStyle('rgba(255,255,255,0.7)')
            ctx.setLineWidth(1)
            ctx.beginPath()
            ctx.moveTo(x + 1, y + 1)
            ctx.lineTo(x + rollPxW * 0.65, y + 1)
            ctx.stroke()
          }
        }

        ctx.setFillStyle('#334155')
        ctx.setFontSize(Math.max(10, Math.floor(cw * 0.024)))
        ctx.fillText(`${layers}层`, margin + 4, margin + 12)
        ctx.draw()
      }

      try {
        const query = wx.createSelectorQuery()
        query.select('#heightCanvas2d').fields({ node: true, size: true }).exec((res) => {
          const item = res && res[0]
          if (!item || !item.node) {
            drawLegacy()
            return
          }

          const canvas = item.node
          const ctx2d = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio || 1
          canvas.width = Math.floor(cw * dpr)
          canvas.height = Math.floor(ch * dpr)
          ctx2d.scale(dpr, dpr)

          const margin = Math.max(2, Math.floor(cw * 0.015))
          const availW = cw - margin * 2
          const availH = ch - margin * 2
          const scale = Math.min(availW / Math.max(1, W), availH / Math.max(1, H))

          const boxW = W * scale
          const boxH = H * scale
          const boxX = margin + (availW - boxW) / 2
          const boxY = margin + (availH - boxH) / 2
          const rollPxW = Math.max(1, D * scale)
          const rollPxH = Math.max(1, rollW * scale)
          const startX = boxX + (boxW - yCount * rollPxW) / 2
          const startY = boxY + boxH - rollPxH

          ctx2d.clearRect(0, 0, cw, ch)
          ctx2d.fillStyle = '#ffffff'
          ctx2d.fillRect(0, 0, cw, ch)

          const depth = Math.max(4, Math.min(12, Math.floor(Math.min(boxW, boxH) * 0.08)))
          // 箱体顶面
          ctx2d.fillStyle = '#f8fafc'
          ctx2d.beginPath()
          ctx2d.moveTo(boxX, boxY)
          ctx2d.lineTo(boxX + depth, boxY - depth)
          ctx2d.lineTo(boxX + boxW + depth, boxY - depth)
          ctx2d.lineTo(boxX + boxW, boxY)
          ctx2d.closePath()
          ctx2d.fill()
          // 箱体右侧面
          ctx2d.fillStyle = '#eef2f7'
          ctx2d.beginPath()
          ctx2d.moveTo(boxX + boxW, boxY)
          ctx2d.lineTo(boxX + boxW + depth, boxY - depth)
          ctx2d.lineTo(boxX + boxW + depth, boxY + boxH - depth)
          ctx2d.lineTo(boxX + boxW, boxY + boxH)
          ctx2d.closePath()
          ctx2d.fill()

          ctx2d.strokeStyle = '#94a3b8'
          ctx2d.lineWidth = 2
          ctx2d.strokeRect(boxX, boxY, boxW, boxH)

          const fillPalette = ['#93c5fd', '#86efac', '#fcd34d', '#fca5a5', '#c4b5fd', '#5eead4']
          const sidePalette = ['#60a5fa', '#4ade80', '#f59e0b', '#f87171', '#a78bfa', '#2dd4bf']
          const strokePalette = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0f766e']

          for (let ly = 0; ly < layers; ly += 1) {
            for (let xi = 0; xi < yCount; xi += 1) {
              const x = startX + xi * rollPxW
              const y = startY - ly * rollPxH
              const idx = (ly + xi) % fillPalette.length
              const d = Math.max(2, Math.min(7, Math.floor(Math.min(rollPxW, rollPxH) * 0.18)))

              // 阴影
              ctx2d.fillStyle = 'rgba(15,23,42,0.12)'
              ctx2d.fillRect(x + d * 0.6, y + d * 0.6, rollPxW, rollPxH)

              // 正面
              ctx2d.fillStyle = fillPalette[idx]
              ctx2d.strokeStyle = strokePalette[idx]
              ctx2d.lineWidth = 1.2
              ctx2d.fillRect(x, y, rollPxW, rollPxH)
              ctx2d.strokeRect(x, y, rollPxW, rollPxH)

              // 顶面
              ctx2d.fillStyle = '#f8fafc'
              ctx2d.beginPath()
              ctx2d.moveTo(x, y)
              ctx2d.lineTo(x + d, y - d)
              ctx2d.lineTo(x + rollPxW + d, y - d)
              ctx2d.lineTo(x + rollPxW, y)
              ctx2d.closePath()
              ctx2d.fill()

              // 侧面
              ctx2d.fillStyle = sidePalette[idx]
              ctx2d.beginPath()
              ctx2d.moveTo(x + rollPxW, y)
              ctx2d.lineTo(x + rollPxW + d, y - d)
              ctx2d.lineTo(x + rollPxW + d, y + rollPxH - d)
              ctx2d.lineTo(x + rollPxW, y + rollPxH)
              ctx2d.closePath()
              ctx2d.fill()

              // 高光线
              ctx2d.strokeStyle = 'rgba(255,255,255,0.7)'
              ctx2d.lineWidth = 1
              ctx2d.beginPath()
              ctx2d.moveTo(x + 1, y + 1)
              ctx2d.lineTo(x + rollPxW * 0.65, y + 1)
              ctx2d.stroke()
            }
          }

          ctx2d.fillStyle = '#334155'
          ctx2d.font = `${Math.max(10, Math.floor(cw * 0.024))}px sans-serif`
          ctx2d.fillText(`${layers}层`, margin + 4, margin + 12)
        })
      } catch (e) {
        drawLegacy()
      }
    }

    if (typeof wx.nextTick === 'function') {
      wx.nextTick(doDraw)
    } else {
      setTimeout(doDraw, 0)
    }
  },

  drawPackingSketch(layout) {
    const doDraw = () => {
      const cw = this.data.canvasWidthPx || 640
      const ch = this.data.canvasHeightPx || 440
      const xCount = layout.xCount || 0
      const yCount = layout.yCount || 0
      const L = layout.cartonL || 0
      const W = layout.cartonW || 0
      const D = layout.rollOuter || 0

      this.setData({ t2CanvasDebug: `开始绘图: ${xCount}x${yCount}, 画布=${cw}x${ch}` })

      const buildGeom = () => {
        const margin = Math.max(2, Math.floor(cw * 0.015))
        const availW = cw - margin * 2
        const availH = ch - margin * 2
        const safeL = Math.max(1, L)
        const safeW = Math.max(1, W)
        const scale = Math.min(availW / safeL, availH / safeW)

        const cartonPxW = safeL * scale
        const cartonPxH = safeW * scale
        const rectX = margin + (availW - cartonPxW) / 2
        const rectY = margin + (availH - cartonPxH) / 2

        const rollPxD = Math.max(1, D * scale)
        const rollR = rollPxD / 2
        const usedW = xCount * rollPxD
        const usedH = yCount * rollPxD
        const startX = rectX + (cartonPxW - usedW) / 2 + rollR
        const startY = rectY + (cartonPxH - usedH) / 2 + rollR

        return {
          margin,
          rectX,
          rectY,
          cartonPxW,
          cartonPxH,
          rollPxD,
          rollR,
          startX,
          startY,
          titleY: margin + 12
        }
      }

      const geom = buildGeom()

      const drawLegacy = () => {
        try {
          const ctx = wx.createCanvasContext('packCanvas')

          ctx.clearRect(0, 0, cw, ch)
          ctx.setFillStyle('#ffffff')
          ctx.fillRect(0, 0, cw, ch)

          ctx.setStrokeStyle('#94a3b8')
          ctx.setLineWidth(2)
          ctx.strokeRect(geom.rectX, geom.rectY, geom.cartonPxW, geom.cartonPxH)

          if (xCount > 0 && yCount > 0) {
            const lightPalette = ['#bfdbfe', '#bbf7d0', '#fde68a', '#fecaca', '#ddd6fe', '#99f6e4']
            const darkPalette = ['#1d4ed8', '#15803d', '#d97706', '#dc2626', '#7c3aed', '#0f766e']
            const strokePalette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']
            for (let yi = 0; yi < yCount; yi += 1) {
              for (let xi = 0; xi < xCount; xi += 1) {
                const cx = geom.startX + xi * geom.rollPxD
                const cy = geom.startY + yi * geom.rollPxD
                const idx = (yi * xCount + xi) % strokePalette.length
                // 阴影
                ctx.setFillStyle('rgba(15,23,42,0.16)')
                ctx.beginPath()
                ctx.arc(cx + geom.rollR * 0.08, cy + geom.rollR * 0.18, geom.rollR * 0.92, 0, Math.PI * 2)
                ctx.fill()

                // 主体渐变（立体）
                const grad = ctx.createCircularGradient(cx - geom.rollR * 0.35, cy - geom.rollR * 0.35, 2, cx, cy, geom.rollR)
                grad.addColorStop(0, lightPalette[idx])
                grad.addColorStop(0.65, strokePalette[idx])
                grad.addColorStop(1, darkPalette[idx])
                ctx.setFillStyle(grad)
                ctx.setStrokeStyle(strokePalette[idx])
                ctx.beginPath()
                ctx.arc(cx, cy, geom.rollR, 0, Math.PI * 2)
                ctx.fill()
                ctx.stroke()

                // 纸芯孔
                ctx.setFillStyle('#f8fafc')
                ctx.beginPath()
                ctx.arc(cx, cy, Math.max(2, geom.rollR * 0.26), 0, Math.PI * 2)
                ctx.fill()
                ctx.setStrokeStyle('rgba(100,116,139,0.75)')
                ctx.stroke()

                // 高光
                ctx.setStrokeStyle('rgba(255,255,255,0.78)')
                ctx.setLineWidth(1.2)
                ctx.beginPath()
                ctx.arc(cx - geom.rollR * 0.14, cy - geom.rollR * 0.14, geom.rollR * 0.58, Math.PI * 1.05, Math.PI * 1.6)
                ctx.stroke()
              }
            }
          }

          ctx.setFillStyle('#334155')
          ctx.setFontSize(Math.max(10, Math.floor(cw * 0.024)))
          ctx.fillText(`${xCount}×${yCount}`, geom.margin + 4, geom.titleY)
          ctx.draw(false, () => {
            this.setData({ t2CanvasDebug: `绘图成功(legacy): ${Date.now()}` })
          })
        } catch (e2) {
          const msg = (e2 && e2.message) ? e2.message : String(e2)
          this.setData({ t2CanvasDebug: `legacy绘图失败: ${msg}` })
          wx.showToast({ title: '画图失败，请看调试信息', icon: 'none' })
        }
      }

      try {
        const query = wx.createSelectorQuery()
        query.select('#packCanvas2d').fields({ node: true, size: true }).exec((res) => {
          const item = res && res[0]
          if (!item || !item.node) {
            this.setData({ t2CanvasDebug: '2d节点不可用，回退legacy绘图' })
            drawLegacy()
            return
          }

          const canvas = item.node
          const ctx2d = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio || 1
          canvas.width = Math.floor(cw * dpr)
          canvas.height = Math.floor(ch * dpr)
          ctx2d.scale(dpr, dpr)

          ctx2d.clearRect(0, 0, cw, ch)
          ctx2d.fillStyle = '#ffffff'
          ctx2d.fillRect(0, 0, cw, ch)

          ctx2d.strokeStyle = '#94a3b8'
          ctx2d.lineWidth = 2
          ctx2d.strokeRect(geom.rectX, geom.rectY, geom.cartonPxW, geom.cartonPxH)

          if (xCount > 0 && yCount > 0) {
            const lightPalette = ['#bfdbfe', '#bbf7d0', '#fde68a', '#fecaca', '#ddd6fe', '#99f6e4']
            const darkPalette = ['#1d4ed8', '#15803d', '#d97706', '#dc2626', '#7c3aed', '#0f766e']
            const strokePalette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

            for (let yi = 0; yi < yCount; yi += 1) {
              for (let xi = 0; xi < xCount; xi += 1) {
                const cx = geom.startX + xi * geom.rollPxD
                const cy = geom.startY + yi * geom.rollPxD
                const idx = (yi * xCount + xi) % strokePalette.length
                // 阴影
                ctx2d.fillStyle = 'rgba(15,23,42,0.16)'
                ctx2d.beginPath()
                ctx2d.arc(cx + geom.rollR * 0.08, cy + geom.rollR * 0.18, geom.rollR * 0.92, 0, Math.PI * 2)
                ctx2d.fill()

                // 主体渐变
                const grad = ctx2d.createRadialGradient(
                  cx - geom.rollR * 0.35,
                  cy - geom.rollR * 0.35,
                  2,
                  cx,
                  cy,
                  geom.rollR
                )
                grad.addColorStop(0, lightPalette[idx])
                grad.addColorStop(0.65, strokePalette[idx])
                grad.addColorStop(1, darkPalette[idx])
                ctx2d.fillStyle = grad
                ctx2d.strokeStyle = strokePalette[idx]
                ctx2d.lineWidth = Math.max(1.5, Math.floor(cw * 0.004))
                ctx2d.beginPath()
                ctx2d.arc(cx, cy, geom.rollR, 0, Math.PI * 2)
                ctx2d.fill()
                ctx2d.stroke()

                // 纸芯孔
                ctx2d.fillStyle = '#f8fafc'
                ctx2d.beginPath()
                ctx2d.arc(cx, cy, Math.max(2, geom.rollR * 0.26), 0, Math.PI * 2)
                ctx2d.fill()
                ctx2d.strokeStyle = 'rgba(100,116,139,0.75)'
                ctx2d.lineWidth = 1
                ctx2d.stroke()

                // 高光
                ctx2d.strokeStyle = 'rgba(255,255,255,0.78)'
                ctx2d.lineWidth = 1.2
                ctx2d.beginPath()
                ctx2d.arc(cx - geom.rollR * 0.14, cy - geom.rollR * 0.14, geom.rollR * 0.58, Math.PI * 1.05, Math.PI * 1.6)
                ctx2d.stroke()
              }
            }
          }

          ctx2d.fillStyle = '#334155'
          ctx2d.font = `${Math.max(10, Math.floor(cw * 0.024))}px sans-serif`
          ctx2d.fillText(`${xCount}×${yCount}`, geom.margin + 4, geom.titleY)

          this.setData({ t2CanvasDebug: `绘图成功(2d): ${Date.now()}` })
        })
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err)
        this.setData({ t2CanvasDebug: `2d绘图异常，回退legacy: ${msg}` })
        drawLegacy()
      }
    }

    if (typeof wx.nextTick === 'function') {
      wx.nextTick(doDraw)
    } else {
      setTimeout(doDraw, 0)
    }
  },

  calcRollAndBoxWeight() {
    const t = this.toNum(this.data.t3ThicknessUm)
    const w = this.toNum(this.data.t3WidthMm)
    const l = this.toNum(this.data.t3LengthM)
    const density = this.toNum(this.data.t3Density)
    const qtyPerBox = this.toNum(this.data.t3QtyPerBox)
    const volL = this.toNum(this.data.t3CartonVolumeL)
    const eff = this.toNum(this.data.t3PackEfficiency)
    const D = this.toNum(this.data.t3OuterMm)
    const rollW = this.toNum(this.data.t3RollWidthMm)

    const perRollKg = this.calcRollWeightKg(t, w, l, density)
    if (!(perRollKg > 0)) {
      wx.showToast({ title: '请填写有效规格参数', icon: 'none' })
      return
    }

    let estQtyByVolume = NaN
    if (volL > 0 && eff > 0 && D > 0 && rollW > 0) {
      const cartonCm3 = volL * 1000
      const rollOuterCm3 = Math.PI * Math.pow(D / 10, 2) / 4 * (rollW / 10)
      if (rollOuterCm3 > 0) {
        estQtyByVolume = Math.floor((cartonCm3 * eff) / rollOuterCm3)
      }
    }

    const boxWeightByQty = qtyPerBox > 0 ? (qtyPerBox * perRollKg) : NaN
    const boxWeightByVol = estQtyByVolume > 0 ? (estQtyByVolume * perRollKg) : NaN

    this.setData({
      t3Result: {
        perRollKg: perRollKg.toFixed(3),
        boxWeightByQty: boxWeightByQty > 0 ? boxWeightByQty.toFixed(2) : '-',
        estQtyByVolume: estQtyByVolume > 0 ? estQtyByVolume : '-',
        boxWeightByVol: boxWeightByVol > 0 ? boxWeightByVol.toFixed(2) : '-'
      }
    })
  }
})
