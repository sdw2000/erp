<template>
  <div class="app-container">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 仓库管理 -->
      <el-tab-pane label="实体仓库设置" name="warehouse">
        <div class="filter-container">
          <el-input
            v-model="listQuery.keyword"
            placeholder="仓库编码或名称"
            style="width: 200px;"
            class="filter-item"
            @keyup.enter.native="handleFilter"
          />
          <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
            查询
          </el-button>
          <el-button class="filter-item" type="success" icon="el-icon-plus" @click="handleCreate">
            新增仓库
          </el-button>
        </div>

        <el-table :data="warehouseList" border style="width: 100%" v-loading="listLoading">
          <el-table-column prop="warehouseCode" label="仓库编码" width="120" />
          <el-table-column prop="warehouseName" label="仓库名称" width="180" />
          <el-table-column prop="warehouseType" label="仓库类型" width="120" />
          <el-table-column prop="manager" label="管理员" width="120" />
          <el-table-column prop="contactPhone" label="联系电话" width="140" />
          <el-table-column prop="status" label="状态" width="100">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" />
          <el-table-column label="操作" width="180" fixed="right">
            <template slot-scope="scope">
              <el-button size="mini" type="primary" @click="handleUpdate(scope.row)">编辑</el-button>
              <el-button size="mini" type="danger" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination
          v-show="total > 0"
          :total="total"
          :page.sync="listQuery.page"
          :limit.sync="listQuery.size"
          @pagination="getList"
        />
      </el-tab-pane>

      <!-- 库位管理 -->
      <el-tab-pane label="卡板位/库位设置" name="location">
        <div class="filter-container">
          <el-select v-model="locQuery.warehouseId" placeholder="选择仓库" clearable class="filter-item" style="width: 200px" @change="handleLocFilter">
            <el-option
              v-for="item in allWarehouses"
              :key="item.id"
              :label="item.warehouseName"
              :value="item.id"
            />
          </el-select>
          <el-input
            v-model="locQuery.keyword"
            placeholder="库位编码或名称"
            style="width: 200px;"
            class="filter-item"
            @keyup.enter.native="handleLocFilter"
          />
          <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleLocFilter">
            查询
          </el-button>
          <el-button class="filter-item" type="success" icon="el-icon-plus" @click="handleCreateLoc">
            新增库位
          </el-button>
        </div>

        <el-table :data="locationList" border style="width: 100%" v-loading="locLoading">
          <el-table-column prop="warehouseName" label="所属仓库" width="180" />
          <el-table-column prop="locationCode" label="库位编码" width="150" />
          <el-table-column prop="locationName" label="库位名称" width="180" />
          <el-table-column prop="locationType" label="库位类型" width="120" />
          <el-table-column prop="status" label="状态" width="100">
            <template slot-scope="scope">
              <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                {{ scope.row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" />
          <el-table-column label="操作" width="180" fixed="right">
            <template slot-scope="scope">
              <el-button size="mini" type="primary" @click="handleUpdateLoc(scope.row)">编辑</el-button>
              <el-button size="mini" type="danger" @click="handleDeleteLoc(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination
          v-show="locTotal > 0"
          :total="locTotal"
          :page.sync="locQuery.page"
          :limit.sync="locQuery.size"
          @pagination="getLocList"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 仓库编辑弹窗 -->
    <el-dialog :title="dialogStatus === 'create' ? '新增仓库' : '编辑仓库'" :visible.sync="dialogFormVisible">
      <el-form ref="dataForm" :model="temp" label-position="left" label-width="100px" style="width: 400px; margin-left:50px;">
        <el-form-item label="仓库编码" prop="warehouseCode">
          <el-input v-model="temp.warehouseCode" />
        </el-form-item>
        <el-form-item label="仓库名称" prop="warehouseName">
          <el-input v-model="temp.warehouseName" />
        </el-form-item>
        <el-form-item label="仓库类型">
          <el-select v-model="temp.warehouseType" placeholder="请选择">
            <el-option label="成品仓" value="成品仓" />
            <el-option label="原料仓" value="原料仓" />
            <el-option label="半成品仓" value="半成品仓" />
            <el-option label="暂存区" value="暂存区" />
          </el-select>
        </el-form-item>
        <el-form-item label="管理员">
          <el-input v-model="temp.manager" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="temp.status" placeholder="请选择">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button type="primary" @click="dialogStatus === 'create' ? createData() : updateData()">确定</el-button>
      </div>
    </el-dialog>

    <!-- 库位编辑弹窗 -->
    <el-dialog :title="locDialogStatus === 'create' ? '新增库位' : '编辑库位'" :visible.sync="locDialogVisible">
      <el-form ref="locForm" :model="locTemp" label-position="left" label-width="100px" style="width: 400px; margin-left:50px;">
        <el-form-item label="所属仓库" prop="warehouseId">
          <el-select v-model="locTemp.warehouseId" placeholder="请选择">
            <el-option
              v-for="item in allWarehouses"
              :key="item.id"
              :label="item.warehouseName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="库位编码" prop="locationCode">
          <el-input v-model="locTemp.locationCode" />
        </el-form-item>
        <el-form-item label="库位名称" prop="locationName">
          <el-input v-model="locTemp.locationName" />
        </el-form-item>
        <el-form-item label="库位类型">
          <el-select v-model="locTemp.locationType" placeholder="请选择">
            <el-option label="卡板位" value="卡板位" />
            <el-option label="货架" value="货架" />
            <el-option label="区域" value="区域" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="locTemp.status" placeholder="请选择">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="locDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="locDialogStatus === 'create' ? createLocData() : updateLocData()">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { 
  getWarehouseList, saveWarehouse, deleteWarehouse, getAllWarehouses,
  getLocationList, saveLocation, deleteLocation 
} from '@/api/warehouse'
import Pagination from '@/components/Pagination'

export default {
  name: 'WarehouseManagement',
  components: { Pagination },
  data() {
    return {
      activeTab: 'warehouse',
      // 仓库相关
      warehouseList: [],
      total: 0,
      listLoading: true,
      listQuery: {
        page: 1,
        size: 20,
        keyword: ''
      },
      temp: {
        id: undefined,
        warehouseCode: '',
        warehouseName: '',
        warehouseType: '成品仓',
        manager: '',
        status: 1
      },
      dialogFormVisible: false,
      dialogStatus: '',
      
      // 库位相关
      locationList: [],
      locTotal: 0,
      locLoading: false,
      locQuery: {
        page: 1,
        size: 20,
        warehouseId: undefined,
        keyword: ''
      },
      locTemp: {
        id: undefined,
        warehouseId: undefined,
        locationCode: '',
        locationName: '',
        locationType: '卡板位',
        status: 1
      },
      locDialogVisible: false,
      locDialogStatus: '',
      allWarehouses: []
    }
  },
  created() {
    this.getList()
    this.getAllWarehouses()
    this.getLocList()
  },
  methods: {
    // 仓库业务
    getList() {
      this.listLoading = true
      getWarehouseList(this.listQuery).then(response => {
        this.warehouseList = response.data.records
        this.total = response.data.total
        this.listLoading = false
      })
    },
    getAllWarehouses() {
      getAllWarehouses().then(response => {
        this.allWarehouses = response.data
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      this.getList()
    },
    resetTemp() {
      this.temp = {
        id: undefined,
        warehouseCode: '',
        warehouseName: '',
        warehouseType: '成品仓',
        manager: '',
        status: 1
      }
    },
    handleCreate() {
      this.resetTemp()
      this.dialogStatus = 'create'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    createData() {
      saveWarehouse(this.temp).then(() => {
        this.dialogFormVisible = false
        this.$notify({ title: '成功', message: '新增成功', type: 'success' })
        this.getList()
        this.getAllWarehouses()
      })
    },
    handleUpdate(row) {
      this.temp = Object.assign({}, row)
      this.dialogStatus = 'update'
      this.dialogFormVisible = true
      this.$nextTick(() => {
        this.$refs['dataForm'].clearValidate()
      })
    },
    updateData() {
      saveWarehouse(this.temp).then(() => {
        this.dialogFormVisible = false
        this.$notify({ title: '成功', message: '保存成功', type: 'success' })
        this.getList()
        this.getAllWarehouses()
      })
    },
    handleDelete(row) {
      this.$confirm('确定删除该仓库吗?', '提示', { type: 'warning' }).then(() => {
        deleteWarehouse(row.id).then(res => {
          if (res.code === 200 || res.code === 20000) {
            this.$notify({ type: 'success', message: '删除成功' })
            this.getList()
            this.getAllWarehouses()
          } else {
            this.$message.error(res.message || '删除失败')
          }
        })
      })
    },

    // 库位业务
    getLocList() {
      this.locLoading = true
      getLocationList(this.locQuery).then(response => {
        this.locationList = response.data.records
        this.locTotal = response.data.total
        this.locLoading = false
      })
    },
    handleLocFilter() {
      this.locQuery.page = 1
      this.getLocList()
    },
    resetLocTemp() {
      this.locTemp = {
        id: undefined,
        warehouseId: undefined,
        locationCode: '',
        locationName: '',
        locationType: '卡板位',
        status: 1
      }
    },
    handleCreateLoc() {
      this.resetLocTemp()
      this.locDialogStatus = 'create'
      this.locDialogVisible = true
      this.$nextTick(() => {
        this.$refs['locForm'].clearValidate()
      })
    },
    createLocData() {
      saveLocation(this.locTemp).then(() => {
        this.locDialogVisible = false
        this.$notify({ title: '成功', message: '新增成功', type: 'success' })
        this.getLocList()
      })
    },
    handleUpdateLoc(row) {
      this.locTemp = Object.assign({}, row)
      this.locDialogStatus = 'update'
      this.locDialogVisible = true
      this.$nextTick(() => {
        this.$refs['locForm'].clearValidate()
      })
    },
    updateLocData() {
      saveLocation(this.locTemp).then(() => {
        this.locDialogVisible = false
        this.$notify({ title: '成功', message: '保存成功', type: 'success' })
        this.getLocList()
      })
    },
    handleDeleteLoc(row) {
      this.$confirm('确定删除该库位吗?', '提示', { type: 'warning' }).then(() => {
        deleteLocation(row.id).then(() => {
          this.$notify({ type: 'success', message: '删除成功' })
          this.getLocList()
        })
      })
    }
  }
}
</script>

<style scoped>
.filter-container {
  margin-bottom: 20px;
}
</style>
