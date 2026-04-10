// js/supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://qibeobvzfkwklxwukkja.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYmVvYnZ6Zmt3a2x4d3Vra2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTY1MTQsImV4cCI6MjA5MTIzMjUxNH0.87rg6tGFJ69jEmN2gedSAwJ0EDRKS5C3UbvXPZzW4W0'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Funções auxiliares
export const supabaseService = {
    // Compras
    async getCompras() {
        const { data, error } = await supabase
            .from('compras')
            .select('*')
            .order('data_compra', { ascending: false })
        return { data, error }
    },
    
    async saveCompra(compra) {
        console.log('Salvando compra no Supabase:', compra)
        
        // Garantir que os campos numéricos são números
        const compraLimpa = {
            ...compra,
            quantidade: Number(compra.quantidade),
            valor_compra: Number(compra.valor_compra),
            valor_total: Number(compra.valor_total)
        }
        
        const { data, error } = await supabase
            .from('compras')
            .insert([compraLimpa])
            .select()
        
        if (error) {
            console.error('Erro Supabase saveCompra:', error)
        }
        
        return { data, error }
    },

    // Atualizar método updateCompra
    async updateCompra(id, compra) {
        console.log('Atualizando compra no Supabase:', { id, compra })
        
        // Garantir que os campos numéricos são números
        const compraLimpa = {
            ...compra,
            quantidade: Number(compra.quantidade),
            valor_compra: Number(compra.valor_compra),
            valor_total: Number(compra.valor_total)
        }
        
        const { data, error } = await supabase
            .from('compras')
            .update(compraLimpa)
            .eq('id', id)
            .select()
        
        if (error) {
            console.error('Erro Supabase updateCompra:', error)
        }
        
        return { data, error }
    },
    
    async deleteCompra(id) {
        const { error } = await supabase
            .from('compras')
            .delete()
            .eq('id', id)
        return { error }
    },
    
    // Produtos
    async getProdutos() {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .order('descricao_produto')
        return { data, error }
    },
    
    async saveProduto(produto) {
        const { data, error } = await supabase
            .from('produtos')
            .insert([produto])
            .select()
        return { data, error }
    },
    
    async updateProduto(id, produto) {
        const { data, error } = await supabase
            .from('produtos')
            .update(produto)
            .eq('id', id)
            .select()
        return { data, error }
    },
    
    async deleteProduto(id) {
        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', id)
        return { error }
    },
    
    async getCodigosCompra() {
        const { data, error } = await supabase
            .from('compras')
            .select('codigo_produto, descricao_produto, fornecedor, categoria')
        return { data, error }
    },
    
    // Vendas
    async getVendas() {
        console.log('Buscando vendas do Supabase...')
        const { data, error } = await supabase
            .from('vendas')
            .select('*')
            .order('data_venda', { ascending: false })
        
        if (error) {
            console.error('Erro Supabase getVendas:', error)
        } else {
            console.log('Vendas encontradas:', data?.length || 0)
        }
        
        return { data, error }
    },
    
    async saveVenda(venda, itens) {
        try {
            const { data: vendaData, error: vendaError } = await supabase
                .from('vendas')
                .insert([venda])
                .select()
            
            if (vendaError) {
                console.error('Erro ao salvar venda:', vendaError)
                return { error: vendaError }
            }
            
            if (!vendaData || vendaData.length === 0) {
                return { error: new Error('Nenhum dado retornado ao salvar venda') }
            }
            
            const vendaId = vendaData[0].id
            
            const itensParaInserir = itens.map(item => ({
                venda_id: vendaId,
                produto_id: item.produto_id,
                codigo_produto: item.codigo_produto,
                descricao_produto: item.descricao_produto,
                fornecedor: item.fornecedor,
                categoria: item.categoria,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                valor_compra: item.valor_compra || 0,
                desconto: item.desconto || 0,
                valor_total: item.valor_total,
                forma_pagamento: item.forma_pagamento || 'Pendente'  // Adicionar forma de pagamento
            }))
            
            const { error: itensError } = await supabase
                .from('itens_venda')
                .insert(itensParaInserir)
            
            if (itensError) {
                console.error('Erro ao salvar itens da venda:', itensError)
                await supabase.from('vendas').delete().eq('id', vendaId)
                return { error: itensError }
            }
            
            return { data: vendaData, error: null }
            
        } catch (err) {
            console.error('Erro inesperado ao salvar venda:', err)
            return { error: err }
        }
    },

    // Atualizar método saveItensVenda
    async saveItensVenda(itens) {
        console.log('Salvando itens no Supabase:', itens)
        
        const { data, error } = await supabase
            .from('itens_venda')
            .insert(itens)
            .select()
        
        if (error) {
            console.error('Erro Supabase saveItensVenda:', error)
        } else {
            console.log('Itens salvos:', data)
        }
        
        return { data, error }
    },
    
    // js/supabase-config.js - Adicionar novos métodos

    // Buscar itens de uma venda específica
    async getItensVenda(vendaId) {
    const { data, error } = await supabase
        .from('itens_venda')
        .select('*')
        .eq('venda_id', vendaId)
    return { data, error }
    },

    // Excluir itens de uma venda
    async deleteItensVenda(vendaId) {
        const { error } = await supabase
            .from('itens_venda')
            .delete()
            .eq('venda_id', vendaId)
        return { error }
    },

    // Excluir uma venda
    async deleteVenda(id) {
        const { error } = await supabase
            .from('vendas')
            .delete()
            .eq('id', id)
        return { error }
    },

    // Atualizar uma venda
    async updateVenda(id, venda) {
        console.log('Atualizando venda no Supabase:', { id, venda })
        
        const { data, error } = await supabase
            .from('vendas')
            .update(venda)
            .eq('id', id)
            .select()
        
        if (error) {
            console.error('Erro Supabase updateVenda:', error)
        } else {
            console.log('Venda atualizada:', data)
        }
        
        return { data, error }
    },

    async deleteItemVenda(id) {
        const { error } = await supabase
            .from('itens_venda')
            .delete()
            .eq('id', id)
        return { error }
    },

    // Buscar todos os itens de venda
    async getAllItensVenda() {
        const { data, error } = await supabase
            .from('itens_venda')
            .select('*')
            .order('created_at', { ascending: false })
        return { data, error }
    },

    // Buscar produto por ID
    async getProdutoById(id) {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('id', id)
            .single()
        return { data, error }
    },
    
    // Auditoria
    async getAuditorias() {
        const { data, error } = await supabase
            .from('auditoria')
            .select('*')
            .order('data_auditoria', { ascending: false })
        return { data, error }
    },
    
    async saveAuditoria(auditoria) {
        const { data, error } = await supabase
            .from('auditoria')
            .insert(auditoria)
            .select()
        return { data, error }
    }
}