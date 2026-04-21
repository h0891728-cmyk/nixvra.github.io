import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type TenantBranding = {
  name: string
  subdomain?: string
}

function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0))
}

function initDocument(title: string, tenant: TenantBranding, subtitle: string) {
  const doc = new jsPDF()

  doc.setFillColor(0, 176, 119)
  doc.rect(0, 0, 210, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(title, 14, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(tenant.name || 'Nixvra Workspace', 196, 11, { align: 'right' })
  doc.text(subtitle, 196, 17, { align: 'right' })

  doc.setTextColor(17, 17, 17)
  return doc
}

export function generateInvoicePDF(invoice: any, tenant: TenantBranding) {
  const doc = initDocument('INVOICE', tenant, `${tenant.subdomain || 'workspace'}.nixvra.online`)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Bill To', 14, 38)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(invoice.customer?.name || 'Walk-in Customer', 14, 45)
  if (invoice.customer?.contact) doc.text(String(invoice.customer.contact), 14, 51)

  doc.setFont('helvetica', 'bold')
  doc.text(`Invoice #: ${invoice.invoiceNumber || invoice.id}`, 196, 38, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 196, 45, { align: 'right' })
  if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 196, 51, { align: 'right' })
  doc.text(`Status: ${invoice.status}`, 196, 57, { align: 'right' })

  autoTable(doc, {
    startY: 68,
    head: [['Item', 'Qty', 'Unit Price', 'Tax', 'Discount', 'Total']],
    body: (invoice.items || []).map((item: any) => [
      item.name || item.itemName || '-',
      Number(item.quantity || 0).toString(),
      formatCurrency(Number(item.unitPrice || 0)),
      Number(item.taxAmount || 0) > 0 ? formatCurrency(Number(item.taxAmount || 0)) : '-',
      Number(item.discount || 0) > 0 ? formatCurrency(Number(item.discount || 0)) : '-',
      formatCurrency(Number(item.total || 0)),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [0, 176, 119], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 4 },
  })

  const finalY = (doc as any).lastAutoTable?.finalY || 100
  const subTotal = Number(invoice.totalAmount || 0) - Number(invoice.taxAmount || 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Subtotal', 140, finalY + 10)
  doc.text(formatCurrency(subTotal), 196, finalY + 10, { align: 'right' })
  doc.text('Tax', 140, finalY + 16)
  doc.text(formatCurrency(Number(invoice.taxAmount || 0)), 196, finalY + 16, { align: 'right' })

  doc.setFontSize(12)
  doc.text('Grand Total', 140, finalY + 25)
  doc.text(formatCurrency(Number(invoice.totalAmount || 0)), 196, finalY + 25, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.setFontSize(8)
  doc.text('Powered by Nixvra', 105, 286, { align: 'center' })

  doc.save(`${invoice.invoiceNumber || invoice.id}_Nixvra.pdf`)
}

export function generateSalarySlipPDF(
  slip: {
    publicId: string
    entityName: string
    entityType: string
    baseSalary: number
    allowances: number
    deductions: number
    netPay: number
    status: string
    taxBreakdown?: { tds?: number; pf?: number; pt?: number } | null
  },
  tenant: TenantBranding,
  cycleLabel: string
) {
  const doc = initDocument('SALARY SLIP', tenant, cycleLabel)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(slip.entityName, 14, 38)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Type: ${slip.entityType}`, 14, 45)
  doc.text(`Slip ID: ${slip.publicId}`, 14, 51)
  doc.text(`Status: ${slip.status}`, 196, 38, { align: 'right' })

  autoTable(doc, {
    startY: 64,
    head: [['Component', 'Amount']],
    body: [
      ['Base Salary', formatCurrency(slip.baseSalary)],
      ['Allowances', formatCurrency(slip.allowances)],
      ['Deductions', formatCurrency(slip.deductions)],
      ['Net Pay', formatCurrency(slip.netPay)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 176, 119], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 5 },
  })

  if (slip.taxBreakdown) {
    const finalY = (doc as any).lastAutoTable?.finalY || 110
    doc.setFont('helvetica', 'bold')
    doc.text('Tax Breakdown', 14, finalY + 12)
    doc.setFont('helvetica', 'normal')
    doc.text(`TDS: ${formatCurrency(Number(slip.taxBreakdown.tds || 0))}`, 14, finalY + 20)
    doc.text(`PF: ${formatCurrency(Number(slip.taxBreakdown.pf || 0))}`, 14, finalY + 26)
    doc.text(`PT: ${formatCurrency(Number(slip.taxBreakdown.pt || 0))}`, 14, finalY + 32)
  }

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.setFontSize(8)
  doc.text('This salary slip was generated by Nixvra.', 105, 286, { align: 'center' })

  doc.save(`salary-slip-${slip.publicId}.pdf`)
}

export function generateExpensePDF(
  expense: {
    publicId?: string
    amount: number
    description: string
    dateOfExpense: string
    status: string
    categoryName?: string | null
    vendorName?: string | null
    currency?: string
  },
  tenant: TenantBranding
) {
  const doc = initDocument('EXPENSE RECORD', tenant, 'Approval / Payment Voucher')
  const currency = expense.currency || 'INR'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Expense Details', 14, 38)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Description: ${expense.description}`, 14, 46)
  doc.text(`Category: ${expense.categoryName || 'Uncategorized'}`, 14, 52)
  doc.text(`Vendor: ${expense.vendorName || 'Internal / Unknown'}`, 14, 58)
  doc.text(`Expense Date: ${new Date(expense.dateOfExpense).toLocaleDateString('en-IN')}`, 14, 64)
  doc.text(`Status: ${expense.status}`, 196, 46, { align: 'right' })
  if (expense.publicId) doc.text(`Record ID: ${expense.publicId}`, 196, 52, { align: 'right' })

  autoTable(doc, {
    startY: 78,
    head: [['Field', 'Value']],
    body: [
      ['Amount', formatCurrency(expense.amount, currency)],
      ['Category', expense.categoryName || 'Uncategorized'],
      ['Vendor', expense.vendorName || 'Internal / Unknown'],
      ['Status', expense.status],
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 176, 119], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 5 },
  })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(102, 102, 102)
  doc.setFontSize(8)
  doc.text('Generated instantly by Nixvra document engine.', 105, 286, { align: 'center' })

  doc.save(`expense-${expense.publicId || Date.now()}.pdf`)
}
