<template>
  <div class="purchase-quotations">
    <el-card>
      <div slot="header" class="clearfix">
        <span>采购报价</span>
        <div style="float:right">
          <el-button type="success" icon="el-icon-download" size="small" @click="handleDownloadTemplate">下载模板</el-button>
          <el-button type="success" plain icon="el-icon-download" size="small" @click="handleDownloadPriceSheetTemplate">初始化模板</el-button>
          <el-button type="primary" icon="el-icon-upload" size="small" @click="triggerImport('init')">报价初始化</el-button>
          <el-button type="warning" icon="el-icon-upload2" size="small" @click="triggerImport('normal')">导入</el-button>
          <el-button type="info" icon="el-icon-download" size="small" @click="handleExport">导出</el-button>
          <el-select v-model="filters.status" placeholder="状态" clearable size="small" style="width:120px; margin-right:8px" @change="handleSearch">
            <el-option label="草稿" value="draft" />
            <el-option label="已提交" value="submitted" />
            <el-option label="已接受" value="accepted" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="已过期" value="expired" />
          </el-select>
          <el-input v-model="filters.supplier" placeholder="供应商" size="small" clearable style="width:200px; margin-right:8px" @keyup.enter.native="handleSearch" @clear="handleSearch" />
          <el-button type="primary" icon="el-icon-plus" size="small" @click="openCreate">新增报价</el-button>
          <input ref="importFile" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImportChange">
        </div>
      </div>

      <el-table v-loading="loading" :data="records" stripe style="width:100%">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="quotationNo" label="报价单号" width="160" />
        <el-table-column prop="supplier" label="供应商" width="180" />
        <el-table-column prop="contactPerson" label="联系人" width="120" />
        <el-table-column prop="contactPhone" label="联系电话" width="140" />
        <el-table-column prop="quotationDate" label="报价日期" width="120" />
        <el-table-column prop="validUntil" label="有效期至" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="statusTag(scope.row.status)" size="small">{{ statusText(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="openDetail(scope.row)">详情</el-button>
            <el-button type="text" size="mini" @click="openEdit(scope.row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="confirmDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          :current-page.sync="pagination.page"
          :page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10,20,50]"
          layout="sizes, prev, pager, next, jumper, ->, total"
          @size-change="onSizeChange"
          @current-change="onPageChange"
        />
      </div>

      <el-dialog title="报价详情" :visible.sync="detailVisible" width="900px">
        <div v-if="current">
          <p><strong>报价单号：</strong>{{ current.quotationNo || '-' }} &nbsp;&nbsp; <strong>供应商：</strong>{{ current.supplier || '-' }}</p>
          <p><strong>联系人：</strong>{{ current.contactPerson || '-' }} / {{ current.contactPhone || '-' }}</p>
          <p><strong>报价日期：</strong>{{ current.quotationDate || '-' }} &nbsp;&nbsp; <strong>有效期至：</strong>{{ current.validUntil || '-' }}</p>
          <p><strong>状态：</strong>{{ statusText(current.status) }}</p>
          <div style="margin-top: 10px;"><strong>物料明细</strong></div>
          <el-table v-if="detailMode(current.items || []) !== 'raw'" :data="detailFilmItems(current.items || [])" stripe style="margin-top:10px">
            <el-table-column type="index" width="50" align="center" />
            <el-table-column prop="materialCode" label="物料编码" width="140" />
            <el-table-column prop="materialName" label="物料名称" width="160" />
            <el-table-column label="规格" width="180">
              <template slot-scope="scope">{{ formatFilmSpec(scope.row) }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="卷数" width="80" />
            <el-table-column prop="sqm" label="平米数" width="90" />
            <el-table-column prop="unitPrice" label="单价" width="90" />
            <el-table-column prop="amount" label="金额" width="100" />
          </el-table>

          <el-table v-else :data="detailRawItems(current.items || [])" stripe style="margin-top:10px">
            <el-table-column type="index" width="50" align="center" />
            <el-table-column prop="materialCode" label="物料编码" width="140" />
            <el-table-column prop="materialName" label="物料名称" width="160" />
            <el-table-column prop="specifications" label="规格" width="160" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column label="总重(kg)" width="100">
              <template slot-scope="scope">{{ scope.row.sqm }}</template>
            </el-table-column>
            <el-table-column prop="unitPrice" label="单价" width="90" />
            <el-table-column prop="amount" label="金额" width="100" />
          </el-table>
        </div>
        <span slot="footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </span>
      </el-dialog>

      <el-dialog :title="isEdit ? '编辑报价' : '新增报价'" :visible.sync="editVisible" width="1100px">
        <el-form :model="form" label-width="100px">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="供应商">
                <el-input v-model="form.supplier" placeholder="供应商名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系人">
                <el-input v-model="form.contactPerson" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="form.contactPhone" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="报价日期">
                <el-date-picker v-model="form.quotationDate" type="date" value-format="yyyy-MM-dd" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="有效期至">
                <el-date-picker v-model="form.validUntil" type="date" value-format="yyyy-MM-dd" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="状态">
                <el-select v-model="form.status" style="width:100%">
                  <el-option label="草稿" value="draft" />
                  <el-option label="已提交" value="submitted" />
                  <el-option label="已接受" value="accepted" />
                  <el-option label="已拒绝" value="rejected" />
                  <el-option label="已过期" value="expired" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="备注">
                <el-input v-model="form.remark" type="textarea" :rows="2" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider>物料明细</el-divider>
          <el-alert
            v-if="form.materialMode === 'raw'"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 8px;"
            title="胶水/原料录入说明：规格填如 180kg/桶 或 900kg/桶，数量填桶数，单价按元/kg 录入，系统自动按总重计算金额。"
          />
          <div style="text-align:right; margin-bottom:8px">
            <el-button type="primary" size="mini" @click="addItem">新增明细</el-button>
          </div>
          <el-table v-if="form.materialMode !== 'raw'" :data="form.filmItems" stripe border size="mini">
            <el-table-column label="#" width="40" align="center">
              <template slot-scope="scope">{{ scope.$index + 1 }}</template>
            </el-table-column>
            <el-table-column label="物料编码" width="190">
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row._editing"
                  v-model="scope.row.materialCode"
                  filterable
                  :filter-method="handleMaterialFilter"
                  allow-create
                  placeholder="选择或输入"
                  size="small"
                  style="width: 100%"
                  @change="onMaterialCodeChange(scope.row, $event)"
                >
                  <el-option v-for="raw in materialOptionsForCurrentMode()" :key="raw.materialCode" :label="raw.materialCode" :value="raw.materialCode">
                    <span style="float:left">{{ raw.materialCode }}</span>
                    <span style="float:right; color:#8492a6; font-size:12px">{{ raw.materialName }}</span>
                  </el-option>
                </el-select>
                <span v-else>{{ scope.row.materialCode || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="物料名称" width="150">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.materialName" size="small" />
                <span v-else>{{ scope.row.materialName || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="颜色" width="90">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.colorCode" size="small" />
                <span v-else>{{ scope.row.colorCode || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="规格" width="200">
              <template slot-scope="scope">
                <div v-if="scope.row._editing" style="display:flex; gap:4px;">
                  <el-input v-model="scope.row.thicknessDisplay" size="small" placeholder="厚度" style="width:60px" />
                  <span style="line-height: 28px;">*</span>
                  <el-input v-model="scope.row.width" size="small" placeholder="宽度" style="width:60px" />
                  <span style="line-height: 28px;">*</span>
                  <el-input v-model="scope.row.lengthDisplay" size="small" placeholder="长度" style="width:60px" />
                </div>
                <span v-else>{{ formatFilmSpec(scope.row) || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="quantityLabel('film')" width="80">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.rolls" size="small" :placeholder="quantityLabel('film')" />
                <span v-else>{{ scope.row.rolls || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="priceLabel('film')" width="90">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.unitPrice" size="small" :placeholder="priceLabel('film')" />
                <span v-else>{{ scope.row.unitPrice || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="面积(㎡)" width="100">
              <template slot-scope="scope">{{ calcFilmSqm(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="100">
              <template slot-scope="scope">{{ calcFilmAmount(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="备注" min-width="140">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.remark" size="small" />
                <span v-else>{{ scope.row.remark || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template slot-scope="scope">
                <el-button v-if="!scope.row._editing" type="text" size="mini" @click="toggleItemEdit(scope.row, true)">编辑</el-button>
                <el-button v-else type="text" size="mini" @click="toggleItemEdit(scope.row, false)">完成</el-button>
                <el-button type="text" size="mini" style="color:#f56c6c" @click="removeFilmItem(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-table v-else :data="form.rawItems" stripe border size="mini">
            <el-table-column label="#" width="40" align="center">
              <template slot-scope="scope">{{ scope.$index + 1 }}</template>
            </el-table-column>
            <el-table-column label="物料编码" width="190">
              <template slot-scope="scope">
                <el-select
                  v-if="scope.row._editing"
                  v-model="scope.row.materialCode"
                  filterable
                  :filter-method="handleMaterialFilter"
                  allow-create
                  placeholder="选择或输入"
                  size="small"
                  style="width: 100%"
                  @change="onMaterialCodeChange(scope.row, $event)"
                >
                  <el-option v-for="raw in materialOptionsForCurrentMode()" :key="raw.materialCode" :label="raw.materialCode" :value="raw.materialCode">
                    <span style="float:left">{{ raw.materialCode }}</span>
                    <span style="float:right; color:#8492a6; font-size:12px">{{ raw.materialName }}</span>
                  </el-option>
                </el-select>
                <span v-else>{{ scope.row.materialCode || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="物料名称" width="150">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.materialName" size="small" />
                <span v-else>{{ scope.row.materialName || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="规格" width="150">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.rawSpec" size="small" placeholder="如: 180kg/桶" />
                <span v-else>{{ scope.row.rawSpec || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="quantityLabel('raw')" width="90">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.quantity" size="small" :placeholder="quantityLabel('raw')" />
                <span v-else>{{ scope.row.quantity || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="总重(kg)" width="100">
              <template slot-scope="scope">{{ calcRawTotalWeight(scope.row) }}</template>
            </el-table-column>
            <el-table-column :label="priceLabel('raw')" width="110">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.unitPrice" size="small" :placeholder="priceLabel('raw')" />
                <span v-else>{{ scope.row.unitPrice || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="金额" width="100">
              <template slot-scope="scope">{{ calcRawAmount(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="备注" min-width="140">
              <template slot-scope="scope">
                <el-input v-if="scope.row._editing" v-model="scope.row.remark" size="small" />
                <span v-else>{{ scope.row.remark || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template slot-scope="scope">
                <el-button v-if="!scope.row._editing" type="text" size="mini" @click="toggleItemEdit(scope.row, true)">编辑</el-button>
                <el-button v-else type="text" size="mini" @click="toggleItemEdit(scope.row, false)">完成</el-button>
                <el-button type="text" size="mini" style="color:#f56c6c" @click="removeRawItem(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form>
        <span slot="footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </span>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import { listPurchaseQuotations, getPurchaseQuotationDetail, createPurchaseQuotation, updatePurchaseQuotation, deletePurchaseQuotation, initializePurchaseQuotationFromPriceSheet } from '@/api/purchaseQuotation'
import { getAllEnabledSpecs } from '@/api/tapeSpec'
import { getRawMaterialList } from '@/api/tapeRawMaterial'

export default {
  name: 'PurchaseQuotations',
  data() {
    return {
      loading: false,
      records: [],
      filters: { supplier: '', status: '' },
      pagination: { page: 1, size: 10, total: 0 },
      importMode: 'normal',
      detailVisible: false,
      editVisible: false,
      isEdit: false,
      current: null,
      specs: [],
      rawMaterials: [],
      materialSearchKeyword: '',
      form: this.emptyForm()
    }
  },
  created() {
    this.fetchList()
    this.fetchSpecs()
    this.fetchRawMaterials()
  },
  methods: {
    async fetchSpecs() {
      try {
        const res = await getAllEnabledSpecs()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.specs = res.data || []
        }
      } catch (e) {
        console.error('获取料号失败', e)
      }
    },
    async fetchRawMaterials() {
      try {
        const res = await getRawMaterialList()
        if (res && (res.code === 200 || res.code === 20000)) {
          this.rawMaterials = res.data || []
        }
      } catch (e) {
        console.error('获取原材料失败', e)
      }
    },
    quoteHeaderColumns() {
      return ['报价单号', '供应商', '联系人', '联系电话', '报价日期', '有效期至', '状态(draft/submitted/accepted/rejected/expired)', '备注']
    },
    quoteItemColumns() {
      return ['报价单号', '物料类型(film/raw)', '物料编码', '物料名称', '规格', '数量/卷数', '单位单价', '备注']
    },
    priceSheetColumns() {
      return ['供应商代码*', '供应商名称', '物料代码*', '物料名称', '单位*', '单价*', '规格/备注']
    },
    buildPriceSheetTemplateData() {
      return {
        headers: {
          sheet1: this.priceSheetColumns()
        },
        rows: {
          sheet1: [[
            'BDJ001',
            '示例供应商A',
            '7058',
            '示例物料A',
            'kg',
            '28.08',
            '橡胶 180kg/桶'
          ], [
            'BDJ001',
            '示例供应商A',
            '708',
            '示例物料B',
            'kg',
            '64.80',
            '1%'
          ], [
            'BG001',
            '示例供应商B',
            'ZX01',
            '示例物料C',
            'pcs',
            '1.65',
            '140*140*580' 
          ]]
        }
      }
    },
    buildQuoteTemplateData() {
      return {
        headers: {
          sheet1: this.quoteHeaderColumns(),
          sheet2: this.quoteItemColumns()
        },
        rows: {
          sheet1: [[
            'Q20260309001',
            '示例供应商',
            '张三',
            '13800138000',
            '2026-03-09',
            '2026-04-09',
            'draft',
            '采购报价初始化示例'
          ]],
          sheet2: [[
            'Q20260309001',
            'film',
            'FM-001',
            '示例薄膜',
            '100μm*1020mm*5000m',
            '10',
            '2.35',
            '单位为元/㎡'
          ], [
            'Q20260309001',
            'raw',
            'GL-001',
            '示例胶水',
            '180kg/桶',
            '8',
            '12.50',
            '单位为元/kg'
          ]]
        }
      }
    },
    normalizeQuoteHeaderRow(row) {
      return {
        quotationNo: String(row['报价单号'] || row.quotationNo || '').trim(),
        supplier: String(row['供应商'] || row.supplier || '').trim(),
        contactPerson: String(row['联系人'] || row.contactPerson || '').trim(),
        contactPhone: String(row['联系电话'] || row.contactPhone || '').trim(),
        quotationDate: String(row['报价日期'] || row.quotationDate || '').trim(),
        validUntil: String(row['有效期至'] || row.validUntil || '').trim(),
        status: String(row['状态(draft/submitted/accepted/rejected/expired)'] || row.status || 'draft').trim() || 'draft',
        remark: String(row['备注'] || row.remark || '').trim()
      }
    },
    normalizeQuoteItemRow(row) {
      return {
        quotationNo: String(row['报价单号'] || row.quotationNo || '').trim(),
        materialType: String(row['物料类型(film/raw)'] || row.materialType || '').trim(),
        materialCode: String(row['物料编码'] || row.materialCode || '').trim(),
        materialName: String(row['物料名称'] || row.materialName || '').trim(),
        specifications: String(row['规格'] || row.specifications || '').trim(),
        quantity: String(row['数量/卷数'] || row.quantity || '').trim(),
        unitPrice: String(row['单位单价'] || row.unitPrice || '').trim(),
        remark: String(row['备注'] || row.remark || '').trim()
      }
    },
    buildQuotePayloadFromGroup(headerRow, itemRows) {
      const firstItem = itemRows[0] || {}
      const materialMode = firstItem.materialType === 'raw' ? 'raw' : 'film'
      const items = itemRows
        .filter(item => item.materialCode || item.materialName)
        .map(item => {
          const isRaw = item.materialType === 'raw'
          const quantity = Number(item.quantity || 0)
          const unitPrice = Number(item.unitPrice || 0)
          const payloadItem = {
            materialCode: item.materialCode,
            materialName: item.materialName,
            specifications: item.specifications,
            thickness: null,
            width: null,
            length: null,
            quantity: quantity || null,
            unit: isRaw ? 'kg' : '卷',
            sqm: null,
            unitPrice: unitPrice || null,
            amount: null,
            remark: item.remark
          }

          if (isRaw) {
            const match = String(item.specifications || '').match(/([0-9]+(?:\.[0-9]+)?)\s*kg\s*\/\s*桶/i)
            const perBucket = match ? Number(match[1]) : null
            const totalWeight = perBucket && quantity ? perBucket * quantity : null
            payloadItem.sqm = totalWeight ? Number(totalWeight.toFixed(2)) : null
            payloadItem.amount = totalWeight && unitPrice ? Number((totalWeight * unitPrice).toFixed(2)) : null
          } else {
            const specParts = String(item.specifications || '').split('*').map(part => part.trim()).filter(Boolean)
            const widthPart = specParts[1] || ''
            const lengthPart = specParts[2] || ''
            const width = widthPart ? Number(widthPart.replace(/[^0-9.]/g, '')) : null
            const length = lengthPart ? Number(lengthPart.replace(/[^0-9.]/g, '')) : null
            payloadItem.width = width
            payloadItem.length = length
            payloadItem.thickness = specParts[0] ? Number(specParts[0].replace(/[^0-9.]/g, '')) : null
            const sqm = width && length && quantity ? ((width / 1000) * length * quantity) : null
            payloadItem.sqm = sqm ? Number(sqm.toFixed(2)) : null
            payloadItem.amount = payloadItem.sqm && unitPrice ? Number((payloadItem.sqm * unitPrice).toFixed(2)) : null
          }

          return payloadItem
        })

      return {
        supplier: headerRow.supplier,
        contactPerson: headerRow.contactPerson,
        contactPhone: headerRow.contactPhone,
        quotationDate: headerRow.quotationDate,
        validUntil: headerRow.validUntil,
        status: headerRow.status || 'draft',
        remark: headerRow.remark,
        items,
        materialMode
      }
    },
    triggerImport(mode = 'normal') {
      this.importMode = mode
      this.$refs.importFile && this.$refs.importFile.click()
    },
    handleDownloadTemplate() {
      import('xlsx').then(XLSX => {
        const template = this.buildQuoteTemplateData()
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([template.headers.sheet1, ...template.rows.sheet1]), '报价单')
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([template.headers.sheet2, ...template.rows.sheet2]), '报价明细')
        XLSX.writeFile(workbook, '采购报价导入模板.xlsx')
      })
    },
    handleDownloadPriceSheetTemplate() {
      import('xlsx').then(XLSX => {
        const template = this.buildPriceSheetTemplateData()
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([template.headers.sheet1, ...template.rows.sheet1]), '报价初始化')
        XLSX.writeFile(workbook, '采购报价初始化模板.xlsx')
      })
    },
    async handleImportChange(e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      try {
        if (this.importMode === 'init') {
          const formData = new FormData()
          formData.append('file', file)
          const res = await initializePurchaseQuotationFromPriceSheet(formData)
          if (res && (res.code === 200 || res.code === 20000)) {
            const data = res.data || {}
            this.$message.success(`初始化完成：生成${data.createdQuotations || 0}张报价单，${data.createdItems || 0}条明细`)
            if (data.failedGroups && data.failedGroups > 0) {
              this.$alert((data.failures || []).join('\n') || '部分分组初始化失败', '初始化结果', { confirmButtonText: '确定' })
            }
            this.fetchList()
          } else {
            this.$message.error((res && res.msg) || '报价初始化失败')
          }
          return
        }

        const XLSX = await import('xlsx')
        const ab = await file.arrayBuffer()
        const wb = XLSX.read(ab, { type: 'array' })
        const headerSheetName = wb.SheetNames.find(name => /报价单|header/i.test(name)) || wb.SheetNames[0]
        const itemSheetName = wb.SheetNames.find(name => /明细|item/i.test(name)) || wb.SheetNames[1]
        const headerRows = XLSX.utils.sheet_to_json(wb.Sheets[headerSheetName], { defval: '' })
        const itemRows = itemSheetName ? XLSX.utils.sheet_to_json(wb.Sheets[itemSheetName], { defval: '' }) : []
        if (!headerRows || !headerRows.length) {
          this.$message.warning('导入文件为空')
          return
        }

        const itemGroups = new Map()
        ;(itemRows || []).forEach(row => {
          const normalized = this.normalizeQuoteItemRow(row)
          const key = normalized.quotationNo || '__default__'
          if (!itemGroups.has(key)) itemGroups.set(key, [])
          itemGroups.get(key).push(normalized)
        })

        let success = 0
        let fail = 0

        for (let index = 0; index < headerRows.length; index++) {
          const header = this.normalizeQuoteHeaderRow(headerRows[index])
          const supplier = header.supplier
          if (!supplier) {
            fail++
            continue
          }
          const quotationNo = header.quotationNo || `TMP-${index + 1}`
          const matchedItems = itemGroups.get(quotationNo) || itemGroups.get('__default__') || []
          const payload = this.buildQuotePayloadFromGroup(header, matchedItems)
          try {
            const res = await createPurchaseQuotation(payload)
            if (res && (res.code === 200 || res.code === 20000)) {
              success++
            } else {
              fail++
            }
          } catch (err) {
            fail++
          }
        }
        this.$message.success(`导入完成：成功${success}条，失败${fail}条`)
        this.fetchList()
      } catch (err) {
        this.$message.error(this.importMode === 'init' ? '报价初始化失败，请检查模板格式' : '导入失败，请检查模板格式')
      } finally {
        this.importMode = 'normal'
        if (this.$refs.importFile) this.$refs.importFile.value = ''
      }
    },
    async handleExport() {
      try {
        const res = await listPurchaseQuotations({ page: 1, size: 100000, supplier: this.filters.supplier, status: this.filters.status })
        if (!(res && (res.code === 200 || res.code === 20000))) {
          this.$message.error('导出失败')
          return
        }
        const data = res.data && res.data.records ? res.data.records : (Array.isArray(res.data) ? res.data : (res.data && res.data.list ? res.data.list : []))
        import('xlsx').then(XLSX => {
          const headerRows = [['报价单号', '供应商', '联系人', '联系电话', '报价日期', '有效期至', '总金额', '状态', '备注']]
          const detailRows = [['报价单号', '物料类型', '物料编码', '物料名称', '规格', '数量/卷数', '单位单价', '金额', '备注']]
          ;(data || []).forEach(item => {
            headerRows.push([
              item.quotationNo || '',
              item.supplier || '',
              item.contactPerson || '',
              item.contactPhone || '',
              item.quotationDate || '',
              item.validUntil || '',
              item.totalAmount || '',
              item.status || '',
              item.remark || ''
            ])
            ;(item.items || []).forEach(detail => {
              detailRows.push([
                item.quotationNo || '',
                detail.width !== null && detail.width !== undefined ? 'film' : 'raw',
                detail.materialCode || '',
                detail.materialName || '',
                detail.specifications || '',
                detail.quantity || '',
                detail.unitPrice || '',
                detail.amount || '',
                detail.remark || ''
              ])
            })
          })
          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(headerRows), '报价单')
          XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(detailRows), '报价明细')
          XLSX.writeFile(workbook, `采购报价数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`)
        })
      } catch (e) {
        this.$message.error('导出失败')
      }
    },
    emptyForm() {
      return {
        id: null,
        quotationNo: '',
        supplier: '',
        contactPerson: '',
        contactPhone: '',
        quotationDate: '',
        validUntil: '',
        status: 'draft',
        remark: '',
        materialMode: '',
        filmItems: [this.emptyFilmItem()],
        rawItems: [this.emptyRawItem()]
      }
    },
    emptyFilmItem() {
      return {
        materialCode: '',
        materialName: '',
        colorCode: '',
        thicknessDisplay: '',
        width: '',
        lengthDisplay: '',
        rolls: '',
        unitPrice: '',
        remark: '',
        _editing: true
      }
    },
    emptyRawItem() {
      return {
        materialCode: '',
        materialName: '',
        rawSpec: '',
        quantity: '',
        totalWeight: '',
        unitPrice: '',
        remark: '',
        _editing: true
      }
    },
    statusTag(status) {
      if (status === 'accepted') return 'success'
      if (status === 'rejected') return 'danger'
      if (status === 'submitted') return 'info'
      return 'warning'
    },
    statusText(status) {
      const map = { draft: '草稿', submitted: '已提交', accepted: '已接受', rejected: '已拒绝', expired: '已过期' }
      return map[status] || status || '-'
    },
    quantityLabel(mode) {
      return mode === 'raw' ? '桶数' : '卷数'
    },
    priceLabel(mode) {
      return mode === 'raw' ? '单价(元/kg)' : '单价(元/㎡)'
    },
    formatNumber(val) {
      if (val === null || val === undefined) return '-'
      return Number(val).toFixed(2)
    },
    async fetchList() {
      this.loading = true
      try {
        const res = await listPurchaseQuotations({ page: this.pagination.page, size: this.pagination.size, supplier: this.filters.supplier, status: this.filters.status })
        if (res && (res.code === 200 || res.code === 20000)) {
          const data = res.data
          if (data && data.records) {
            this.records = data.records
            this.pagination.total = Number(data.total || 0)
          } else if (Array.isArray(data)) {
            this.records = data
            this.pagination.total = Number(data.length)
          } else if (typeof data === 'object' && data.total !== undefined && data.list) {
            // 兼容 total/list 结构
            this.records = data.list
            this.pagination.total = Number(data.total || 0)
          }
        }
      } catch (e) {
        this.$message.error('获取报价失败')
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.pagination.page = 1
      this.fetchList()
    },
    onSizeChange(val) {
      this.pagination.size = val
      this.pagination.page = 1
      this.fetchList()
    },
    onPageChange(val) {
      this.pagination.page = val
      this.fetchList()
    },
    async openDetail(row) {
      const res = await getPurchaseQuotationDetail(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.current = res.data
        this.detailVisible = true
      }
    },
    openCreate() {
      this.isEdit = false
      this.form = this.emptyForm()
      this.editVisible = true
    },
    async openEdit(row) {
      const res = await getPurchaseQuotationDetail(row.id)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.isEdit = true
        this.form = this.normalizeEditForm(res.data)
        ;(this.form.filmItems || []).forEach(item => { item._editing = false })
        ;(this.form.rawItems || []).forEach(item => { item._editing = false })
        this.editVisible = true
      }
    },
    normalizeEditForm(data) {
      const form = {
        ...data,
        materialMode: '',
        filmItems: [],
        rawItems: []
      }
      ;(data.items || []).forEach(item => {
        if (this.isFilmItem(item)) {
          form.filmItems.push({
            id: item.id,
            materialCode: item.materialCode,
            materialName: item.materialName,
            colorCode: '',
            thicknessDisplay: item.thickness,
            width: item.width,
            lengthDisplay: item.length,
            rolls: item.quantity,
            unitPrice: item.unitPrice,
            remark: item.remark,
            _editing: false
          })
        } else {
          form.rawItems.push({
            id: item.id,
            materialCode: item.materialCode,
            materialName: item.materialName,
            rawSpec: item.specifications || '',
            quantity: item.quantity,
            totalWeight: item.sqm,
            unitPrice: item.unitPrice,
            remark: item.remark,
            _editing: false
          })
        }
      })
      if (!form.filmItems.length) form.filmItems = [this.emptyFilmItem()]
      if (!form.rawItems.length) form.rawItems = [this.emptyRawItem()]
      form.materialMode = form.filmItems.some(i => i.materialCode || i.materialName) ? 'film' : (form.rawItems.some(i => i.materialCode || i.materialName) ? 'raw' : '')
      return form
    },
    isFilmItem(item) {
      return item.width !== null && item.width !== undefined && item.length !== null && item.length !== undefined
    },
    detailFilmItems(items) {
      return (items || []).filter(it => this.isFilmItem(it))
    },
    detailRawItems(items) {
      return (items || []).filter(it => !this.isFilmItem(it))
    },
    detailMode(items) {
      const list = items || []
      if (!list.length) return 'film'
      return this.isFilmItem(list[0]) ? 'film' : 'raw'
    },
    filmMaterialOptions() {
      return (this.rawMaterials || []).filter(item => String(item.unit || '').toLowerCase().includes('m'))
    },
    nonFilmMaterialOptions() {
      return (this.rawMaterials || []).filter(item => !String(item.unit || '').toLowerCase().includes('m'))
    },
    materialOptionsForCurrentMode() {
      let list = []
      if (this.form.materialMode === 'film') list = this.filmMaterialOptions()
      else if (this.form.materialMode === 'raw') list = this.nonFilmMaterialOptions()
      else list = this.rawMaterials || []

      const keyword = String(this.materialSearchKeyword || '').trim().toLowerCase()
      if (!keyword) return list
      return list.filter(item => {
        const code = String(item.materialCode || '').toLowerCase()
        const name = String(item.materialName || '').toLowerCase()
        return code.includes(keyword) || name.includes(keyword)
      })
    },
    handleMaterialFilter(query) {
      this.materialSearchKeyword = query || ''
    },
    detectMaterialModeByCode(code) {
      const raw = (this.rawMaterials || []).find(r => r.materialCode === code)
      if (!raw) return this.form.materialMode || 'film'
      const unitText = String(raw.unit || '').toLowerCase()
      const nameText = `${raw.materialName || ''}${raw.spec || ''}`
      if (unitText.includes('m') && !unitText.includes('kg')) return 'film'
      if (unitText.includes('kg') || /胶水|粘合|原料|kg|桶/i.test(nameText)) return 'raw'
      return this.form.materialMode || 'film'
    },
    formatFilmSpec(item) {
      if (!item) return ''
      return [item.thicknessDisplay || item.thickness || '', item.width || '', item.lengthDisplay || item.length || ''].filter(Boolean).join('*')
    },
    onMaterialCodeChange(row, code) {
      const mode = this.detectMaterialModeByCode(code)
      if (!this.form.materialMode) {
        this.form.materialMode = mode
      }
      if (this.form.materialMode !== mode) {
        this.form.materialMode = mode
        if (mode === 'film') {
          this.form.rawItems = [this.emptyRawItem()]
          this.form.filmItems = [{ ...this.emptyFilmItem(), materialCode: code }]
          row = this.form.filmItems[0]
        } else {
          this.form.filmItems = [this.emptyFilmItem()]
          this.form.rawItems = [{ ...this.emptyRawItem(), materialCode: code }]
          row = this.form.rawItems[0]
        }
      }

      const raw = this.rawMaterials.find(r => r.materialCode === code)
      if (raw) {
        row.materialName = raw.materialName
      }
      if (mode === 'film') {
        const spec = this.specs.find(s => s.materialCode === code)
        if (spec) {
          if (!row.materialName) row.materialName = spec.productName
          row.colorCode = spec.colorCode
          row.thicknessDisplay = spec.totalThickness
          row.width = spec.width
          row.lengthDisplay = spec.length
        }
      } else {
        row.rawSpec = (raw && raw.spec) || row.rawSpec || ''
      }
    },
    addFilmItem() {
      this.form.materialMode = 'film'
      this.form.filmItems.push(this.emptyFilmItem())
    },
    removeFilmItem(index) {
      this.form.filmItems.splice(index, 1)
      if (!this.form.filmItems.length) this.form.filmItems.push(this.emptyFilmItem())
    },
    addRawItem() {
      this.form.materialMode = 'raw'
      this.form.rawItems.push(this.emptyRawItem())
    },
    removeRawItem(index) {
      this.form.rawItems.splice(index, 1)
      if (!this.form.rawItems.length) this.form.rawItems.push(this.emptyRawItem())
    },
    addItem() {
      if (this.form.materialMode === 'raw') this.addRawItem()
      else this.addFilmItem()
    },
    toggleItemEdit(row, editing) {
      if (!row) return
      this.$set(row, '_editing', !!editing)
    },
    parseSpecKg(spec) {
      if (!spec) return null
      const m = String(spec).match(/([0-9]+(?:\.[0-9]+)?)\s*kg\s*\/\s*桶/i)
      return m ? Number(m[1]) : null
    },
    calcFilmSqm(row) {
      const w = Number(row.width)
      const l = Number(row.lengthDisplay)
      const r = Number(row.rolls)
      if (!(w > 0 && l > 0 && r > 0)) return '0'
      return ((w / 1000) * l * r).toFixed(2)
    },
    calcFilmAmount(row) {
      const sqm = Number(this.calcFilmSqm(row))
      const price = Number(row.unitPrice || 0)
      if (!(sqm > 0 && price > 0)) return '0'
      return (sqm * price).toFixed(2)
    },
    calcRawTotalWeight(row) {
      const perBucket = this.parseSpecKg(row.rawSpec)
      const qty = Number(row.quantity)
      if (perBucket && Number.isFinite(qty) && qty > 0) {
        return (perBucket * qty).toFixed(2)
      }
      const explicit = Number(row.totalWeight)
      if (Number.isFinite(explicit) && explicit > 0) {
        return explicit.toFixed(2)
      }
      return '0'
    },
    calcRawAmount(row) {
      const weight = Number(this.calcRawTotalWeight(row))
      const price = Number(row.unitPrice || 0)
      if (!(weight > 0 && price > 0)) return '0'
      return (weight * price).toFixed(2)
    },
    async save() {
      if (!this.form.supplier) {
        this.$message.warning('请填写供应商')
        return
      }
      const currentMode = this.form.materialMode || 'film'
      const filmItems = (this.form.filmItems || [])
        .filter(item => item.materialCode || item.materialName)
        .map(item => ({
          id: item.id,
          materialCode: item.materialCode,
          materialName: item.materialName,
          specifications: [item.thicknessDisplay || '', item.width || '', item.lengthDisplay || ''].filter(Boolean).join('*'),
          thickness: item.thicknessDisplay ? Number(item.thicknessDisplay) : null,
          width: item.width ? Number(item.width) : null,
          length: item.lengthDisplay ? Number(item.lengthDisplay) : null,
          quantity: item.rolls ? Number(item.rolls) : null,
          unit: '卷',
          sqm: Number(this.calcFilmSqm(item)),
          unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
          amount: Number(this.calcFilmAmount(item)),
          remark: item.remark
        }))

      const rawItems = (this.form.rawItems || [])
        .filter(item => item.materialCode || item.materialName)
        .map(item => ({
          id: item.id,
          materialCode: item.materialCode,
          materialName: item.materialName,
          specifications: item.rawSpec,
          thickness: null,
          width: null,
          length: null,
          quantity: item.quantity ? Number(item.quantity) : null,
          unit: 'kg',
          sqm: Number(this.calcRawTotalWeight(item)),
          unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
          amount: Number(this.calcRawAmount(item)),
          remark: item.remark
        }))

      const payload = {
        ...this.form,
        items: currentMode === 'raw' ? rawItems : filmItems
      }

      const api = this.isEdit ? updatePurchaseQuotation : createPurchaseQuotation
      const res = await api(payload)
      if (res && (res.code === 200 || res.code === 20000)) {
        this.$message.success('保存成功')
        this.editVisible = false
        this.fetchList()
      }
    },
    confirmDelete(row) {
      this.$confirm(`确认删除报价单【${row.quotationNo || row.id}】吗？删除后不可恢复。`, '删除确认', {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        closeOnClickModal: false,
        closeOnPressEscape: false
      })
        .then(() => this.remove(row.id))
        .catch(() => {})
    },
    async remove(id) {
      try {
        const res = await deletePurchaseQuotation(id)
        if (res && (res.code === 200 || res.code === 20000)) {
          this.$message.success('删除成功')
          this.records = (this.records || []).filter(item => item.id !== id)
          this.pagination.total = Math.max(0, Number(this.pagination.total || 0) - 1)
          if (this.records.length === 0 && this.pagination.page > 1) {
            this.pagination.page = this.pagination.page - 1
          }
          this.fetchList()
          return
        }
        this.$message.error((res && res.msg) || '删除失败')
      } catch (e) {
        this.$message.error((e && e.message) || '删除失败，请稍后重试')
      }
    }
  }
}
</script>

<style scoped>
.pager {
  margin-top: 12px;
  text-align: right;
}
</style>
