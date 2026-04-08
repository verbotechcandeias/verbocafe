// js/utils/formatters.js

export function formatDate(date) {
    if (!date) return ''
    
    // Se a data for uma string no formato YYYY-MM-DD
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = date.split('-')
        return `${dia}/${mes}/${ano}`
    }
    
    // Caso contrário, tratar como objeto Date
    const d = new Date(date)
    
    // Verificar se a data é válida
    if (isNaN(d.getTime())) return ''
    
    // Ajustar para o fuso local
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    
    return `${day}/${month}/${year}`
}

export function formatDateTime(date) {
    if (!date) return ''
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
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