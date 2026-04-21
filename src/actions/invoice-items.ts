'use server'

import { getSession } from '@/lib/session'
import { getTenantDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Fetch products list
 */
export async function getProductsAction() {
  const session = await getSession()
  if (!session?.tenantId) return []
  try {
    const db = await getTenantDb(session.databaseName)
    const products = await db.product.findMany({
      where: { deletedAt: null }
    })
    return products.map((p: any) => ({
      id: p.publicId,
      name: p.name,
      price: p.price,
      type: p.type
    }))
  } catch (e: any) {
    return []
  }
}

/**
 * Fetch a specific invoice with its line items
 */
export async function getInvoiceDetailsAction(invoicePublicId: string) {
  const session = await getSession()
  if (!session?.tenantId) return null

  try {
    const db = await getTenantDb(session.databaseName)
    
    // Handle both legacy numeric entity IDs and current publicId-based invoice links.
    const invoiceRows: any[] = await db.$queryRaw`
      SELECT 
        i.publicId as invoiceId, i.amount as totalAmount, i.taxAmount, i.status, i.dueDate, i.invoiceNumber,
        i.businessEntityId,
        e.name as entityName, e.contact as entityContact,
        ii.publicId as itemId, ii.itemName, ii.quantity, ii.unitPrice, ii.taxAmount as itemTax, ii.discount as itemDiscount, ii.total as itemTotal, ii.productId
      FROM invoices i
      LEFT JOIN business_entities e ON (
        e.publicId = i.businessEntityId
        OR CAST(e.id AS CHAR) = i.businessEntityId
      )
      LEFT JOIN invoice_items ii ON i.id = CAST(ii.invoiceId AS UNSIGNED)
      WHERE i.publicId = ${invoicePublicId}
    `

    if (!invoiceRows.length) return null

    // Transform flat SQL response to structured object
    const head = invoiceRows[0]
    const invoice = {
      id: head.invoiceId,
      invoiceNumber: head.invoiceNumber,
      status: head.status,
      dueDate: head.dueDate,
      totalAmount: head.totalAmount,
      taxAmount: head.taxAmount,
      customer: {
        name: head.entityName,
        contact: head.entityContact
      },
      items: invoiceRows.filter(r => r.itemId).map(r => ({
        id: r.itemId,
        productId: r.productId,
        name: r.itemName,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        taxAmount: r.itemTax,
        discount: r.itemDiscount,
        total: r.itemTotal
      }))
    }

    return invoice
  } catch (e: any) {
    console.error('[getInvoiceDetailsAction]', e)
    return null
  }
}

/**
 * Create a detailed Invoice with line items
 */
export async function createDetailedInvoiceAction(data: {
  businessEntityPublicId: string
  dueDate?: string
  items: {
    productId?: string
    itemName: string
    quantity: number
    unitPrice: number
    taxAmount: number
    discount: number
    total: number
  }[]
}) {
  const session = await getSession()
  if (!session?.tenantId) return { success: false, error: 'Not authenticated' }

  try {
    const db = await getTenantDb(session.databaseName)
    
    // Resolve the canonical entity identity and persist the stable publicId on invoices.
    const entity = await db.businessEntity.findUnique({
      where: { publicId: data.businessEntityPublicId }
    })
    
    if (!entity) return { success: false, error: 'Customer entity not found' }

    // Calculate totals
    const grandTotal = data.items.reduce((sum, item) => sum + item.total, 0)
    const grandTax = data.items.reduce((sum, item) => sum + item.taxAmount, 0)
    
    // Generate Invoice Number
    const count = await db.invoice.count()
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    // Start a transaction to create invoice and items
    await db.$transaction(async (tx: any) => {
      const invoice = await tx.invoice.create({
        data: {
          businessEntityId: entity.publicId,
          invoiceNumber,
          amount: grandTotal,
          taxAmount: grandTax,
          status: 'PENDING',
          dueDate: data.dueDate ? new Date(data.dueDate) : null
        }
      })

      for (const item of data.items) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id.toString(),
            productId: item.productId || null,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxAmount: item.taxAmount,
            discount: item.discount,
            total: item.total
          }
        })
      }
    })

    revalidatePath('/dashboard/financials/invoices')
    const createdInvoice = await db.invoice.findUnique({
      where: { invoiceNumber },
      select: { publicId: true, invoiceNumber: true },
    })

    return {
      success: true,
      invoiceNumber,
      invoicePublicId: createdInvoice?.publicId || null,
    }
  } catch (e: any) {
    console.error('[createDetailedInvoiceAction]', e)
    return { success: false, error: 'Failed to create invoice' }
  }
}
