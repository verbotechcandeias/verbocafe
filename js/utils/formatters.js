// js/utils/formatters.js
import * as dateTime from './datetime.js'

export function formatDate(date) {
    return dateTime.formatDate(date)
}

export function formatDateTime(date) {
    return dateTime.formatDateTime(date)
}

export function formatCurrency(value) {
    if (value === null || value === undefined) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}

export function formatNumber(value) {
    if (value === null || value === undefined) return '0'
    return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value) {
    if (value === null || value === undefined) return '0%'
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100)
}

export function parseCurrency(value) {
    if (typeof value === 'string') {
        return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0
    }
    return value || 0
}