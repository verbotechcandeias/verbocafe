// js/utils/datetime.js

/**
 * Retorna a data/hora atual em ISO (para salvar no banco)
 * @returns {string} Data/hora em ISO
 */
export function getAgoraISO() {
    const agora = new Date()
    return agora.toISOString()
}

/**
 * Converte uma data ISO do banco para o fuso de Brasília (subtrai 3 horas)
 * @param {string|Date} data - Data em UTC
 * @returns {Date} Data ajustada para Brasília
 */
export function toBrasilia(data) {
    if (!data) return null
    
    const date = typeof data === 'string' ? new Date(data) : new Date(data)
    if (isNaN(date.getTime())) return null
    
    // Subtrair 3 horas do UTC para obter Brasília (UTC-3)
    return new Date(date.getTime() - (3 * 60 * 60 * 1000))
}

/**
 * Retorna a data/hora atual no fuso local
 * @returns {Date} Data atual
 */
export function getDataHoraBrasilia() {
    return new Date()
}

/**
 * Formata uma data para exibição no formato DD/MM/YYYY
 * @param {string|Date} data - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatDate(data) {
    if (!data) return ''
    
    if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = data.split('-')
        return `${dia}/${mes}/${ano}`
    }
    
    const d = toBrasilia(data)
    if (!d) return ''
    
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ano = d.getFullYear()
    
    return `${dia}/${mes}/${ano}`
}

/**
 * Formata uma data/hora para exibição no formato DD/MM/YYYY HH:MM
 * Subtrai 3 horas para ajustar ao horário de Brasília (UTC-3)
 * @param {string|Date} data - Data do banco
 * @returns {string} Data e hora formatadas
 */
export function formatDateTime(data) {
    if (!data) return ''
    
    const date = new Date(data)
    if (isNaN(date.getTime())) return ''
    
    // Subtrair 3 horas do UTC para obter horário de Brasília
    const brasiliaDate = new Date(date.getTime() - (3 * 60 * 60 * 1000))
    
    const dia = String(brasiliaDate.getDate()).padStart(2, '0')
    const mes = String(brasiliaDate.getMonth() + 1).padStart(2, '0')
    const ano = brasiliaDate.getFullYear()
    const horas = String(brasiliaDate.getHours()).padStart(2, '0')
    const minutos = String(brasiliaDate.getMinutes()).padStart(2, '0')
    
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`
}

/**
 * Extrai a data no formato YYYY-MM-DD de uma string de data
 * @param {string|Date} data - Data do banco
 * @returns {string} Data no formato YYYY-MM-DD
 */
export function extrairDataLocal(data) {
    if (!data) return null
    
    const d = toBrasilia(data)
    if (!d) return null
    
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    
    return `${ano}-${mes}-${dia}`
}

/**
 * Extrai mês e ano no formato YYYY-MM
 * @param {string|Date} data - Data do banco
 * @returns {string} Mês/ano no formato YYYY-MM
 */
export function extrairMesAnoLocal(data) {
    if (!data) return null
    
    const d = toBrasilia(data)
    if (!d) return null
    
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    
    return `${ano}-${mes}`
}

/**
 * Obtém a data de hoje no formato YYYY-MM-DD
 * @returns {string} Data de hoje
 */
export function getHojeISO() {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    
    return `${ano}-${mes}-${dia}`
}

/**
 * Obtém a data/hora atual para exibição
 * @returns {string} Data/hora atual formatada
 */
export function getAgoraFormatado() {
    const agora = new Date()
    const dia = String(agora.getDate()).padStart(2, '0')
    const mes = String(agora.getMonth() + 1).padStart(2, '0')
    const ano = agora.getFullYear()
    const horas = String(agora.getHours()).padStart(2, '0')
    const minutos = String(agora.getMinutes()).padStart(2, '0')
    
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`
}

/**
 * Formata uma data para o formato ISO (YYYY-MM-DD)
 * @param {Date} date - Data a ser formatada
 * @returns {string} Data no formato YYYY-MM-DD
 */
export function formatISODate(date) {
    if (!date) return ''
    
    const ano = date.getFullYear()
    const mes = String(date.getMonth() + 1).padStart(2, '0')
    const dia = String(date.getDate()).padStart(2, '0')
    
    return `${ano}-${mes}-${dia}`
}

export default {
    getAgoraISO,
    toBrasilia,
    getDataHoraBrasilia,
    formatDate,
    formatDateTime,
    extrairDataLocal,
    extrairMesAnoLocal,
    getHojeISO,
    getAgoraFormatado,
    formatISODate
}