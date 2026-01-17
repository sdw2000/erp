<template>
  <div class="film-selector">
    <el-form :model="form" label-width="120px">
      <el-form-item label="薄膜规格">
        <el-row :gutter="10">
          <el-col :span="8">
            <el-input v-model.number="form.thickness" placeholder="厚度(μm)" @change="handleSearch">
              <template slot="prepend">厚度</template>
              <template slot="append">μm</template>
            </el-input>
          </el-col>
          <el-col :span="8">
            <el-input v-model.number="form.width" placeholder="宽度(mm)" @change="handleSearch">
              <template slot="prepend">宽度</template>
              <template slot="append">mm</template>
            </el-input>
          </el-col>
          <el-col :span="8">
            <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          </el-col>
        </el-row>
      </el-form-item>

      <el-form-item label="可用薄膜">
        <el-table
          v-loading="loading"
          :data="filmList"
          border
          stripe
          max-height="300"
          highlight-current-row
          @row-click="handleSelectFilm"
        >
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="materialCode" label="物料编号" width="140" />
          <el-table-column prop="materialName" label="物料名称" width="180" show-overflow-tooltip />
          <el-table-column prop="specDesc" label="规格" width="120" align="center">
            <template slot-scope="scope">
              <el-tag type="info" size="small">{{ scope.row.specDesc }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="可用面积" width="120" align="right">
            <template slot-scope="scope">
              <span style="color: #67c23a; font-weight: bold">{{ scope.row.availableArea }} ㎡</span>
            </template>
          </el-table-column>
          <el-table-column label="可用卷数" width="100" align="center">
            <template slot-scope="scope">
              <el-tag type="success">{{ scope.row.availableRolls }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-form-item>

      <el-form-item v-if="selectedFilm.id" label="已选薄膜">
        <el-alert type="success" :closable="false">
          <div style="font-size: 14px">
            <strong>{{ selectedFilm.materialCode }}</strong> - {{ selectedFilm.materialName }}
            <span style="margin-left: 10px">规格: {{ selectedFilm.specDesc }}</span>
            <span style="margin-left: 10px">可用: {{ selectedFilm.availableArea }} ㎡ / {{ selectedFilm.availableRolls }} 卷</span>
          </div>
        </el-alert>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { getFilmStockList, getFilmStockBySpec } from '@/api/rawMaterialStock'

export default {
  name: 'FilmSelector',
  props: {
    // 默认厚度
    defaultThickness: {
      type: Number,
      default: null
    },
    // 默认宽度
    defaultWidth: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      loading: false,
      form: {
        thickness: this.defaultThickness,
        width: this.defaultWidth
      },
      filmList: [],
      selectedFilm: {}
    }
  },
  mounted() {
    if (this.defaultThickness || this.defaultWidth) {
      this.handleSearch()
    } else {
      this.loadAllFilms()
    }
  },
  methods: {
    // 加载所有薄膜
    async loadAllFilms() {
      this.loading = true
      try {
        const res = await getFilmStockList()
        if (res.code === 20000) {
          this.filmList = res.data || []
        }
      } catch (error) {
        this.$message.error('加载薄膜库存失败')
      } finally {
        this.loading = false
      }
    },

    // 按规格查询
    async handleSearch() {
      if (!this.form.thickness && !this.form.width) {
        this.loadAllFilms()
        return
      }

      this.loading = true
      try {
        const res = await getFilmStockBySpec(this.form)
        if (res.code === 20000) {
          this.filmList = res.data || []
          if (this.filmList.length === 0) {
            this.$message.warning('未找到符合条件的薄膜库存')
          }
        }
      } catch (error) {
        this.$message.error('查询失败')
      } finally {
        this.loading = false
      }
    },

    // 选择薄膜
    handleSelectFilm(row) {
      this.selectedFilm = row
      this.$emit('select', row)
    },

    // 获取已选薄膜
    getSelectedFilm() {
      return this.selectedFilm
    }
  }
}
</script>

<style scoped>
.film-selector {
  padding: 10px;
}

.el-table >>> .current-row {
  background-color: #ecf5ff !important;
  font-weight: bold;
}
</style>
