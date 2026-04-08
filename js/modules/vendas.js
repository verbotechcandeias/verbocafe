// js/modules/vendas.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'
import * as validators from '../utils/validators.js'

class VendasModule {
    constructor() {
        this.produtos = []
        this.itensVenda = []
        this.vendaAtual = null
        this.numeroVenda = this.gerarNumeroVenda()
    }
    
    async init() {
        await this.carregarProdutos()
        this.setupEventListeners()
        this.setDataVenda()
        this.setNumeroVenda()
    }
    
    gerarNumeroVenda() {
        const date = new Date()
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
        return `VND-${year}${month}${day}-${random}`
    }
    
    async carregarProdutos() {
        const { data, error } = await supabaseService.getProdutos()
        
        if (error) {
            console.error('Erro ao carregar produtos:', error)
            return
        }
        
        this.produtos = data || []
        this.preencherSelectProdutos()
    }
    
    preencherSelectProdutos() {
        const select = document.getElementById('descricaoVenda')
        if (!select) return
        
        select.innerHTML = '<option value="">Selecione um produto...</option>'
        
        this.produtos
            .filter(p => p.quantidade > 0)
            .forEach(produto => {
                const option = document.createElement('option')
                option.value = produto.id
                option.textContent = `${produto.descricao_produto} (Estoque: ${produto.quantidade})`
                option.dataset.codigo = produto.codigo_produto
                option.dataset.fornecedor = produto.fornecedor
                option.dataset.categoria = produto.categoria
                option.dataset.valor = produto.valor_venda
                option.dataset.estoque = produto.quantidade
                select.appendChild(option)
            })
    }
    
    setupEventListeners() {
        const selectProduto = document.getElementById('descricaoVenda')
        if (selectProduto) {
            selectProduto.addEventListener('change', (e) => {
                this.onProdutoSelecionado(e.target)
            })
        }
        
        // Calcular valor total automaticamente
        const quantidade = document.getElementById('quantidadeVenda')
        const desconto = document.getElementById('descontoVenda')
        const valorUnitario = document.getElementById('valorUnitarioVenda')
        
        if (quantidade) {
            quantidade.addEventListener('input', () => {
                this.calcularValorTotal()
                this.validarQuantidade()
            })
        }
        
        if (desconto) {
            desconto.addEventListener('input', () => {
                this.formatarMoeda(desconto)
                this.calcularValorTotal()
            })
            
            desconto.addEventListener('blur', () => {
                if (!desconto.value || desconto.value.trim() === '') {
                    desconto.value = '0,00'
                }
            })
        }
    }
    
    formatarMoeda(input) {
        if (!input) return
        
        let value = input.value
        value = value.replace(/\D/g, '')
        
        if (value === '') {
            input.value = ''
            return
        }
        
        const number = parseInt(value) / 100
        input.value = number.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }
    
    obterValorNumerico(input) {
        if (!input) return 0
        if (typeof input === 'number') return input
        
        const valor = input.value || '0'
        const valorLimpo = valor
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, '')
            .trim()
        
        const numero = parseFloat(valorLimpo)
        return isNaN(numero) ? 0 : numero
    }
    
    onProdutoSelecionado(select) {
        const selectedOption = select.options[select.selectedIndex]
        
        if (select.value) {
            document.getElementById('codigoVenda').value = selectedOption.dataset.codigo || ''
            document.getElementById('fornecedorVenda').value = selectedOption.dataset.fornecedor || ''
            document.getElementById('categoriaVenda').value = selectedOption.dataset.categoria || ''
            
            const valor = parseFloat(selectedOption.dataset.valor) || 0
            document.getElementById('valorUnitarioVenda').value = formatters.formatCurrency(valor)
            
            const quantidadeInput = document.getElementById('quantidadeVenda')
            quantidadeInput.max = selectedOption.dataset.estoque || 0
            quantidadeInput.dataset.estoque = selectedOption.dataset.estoque || 0
            
            this.calcularValorTotal()
        } else {
            document.getElementById('codigoVenda').value = ''
            document.getElementById('fornecedorVenda').value = ''
            document.getElementById('categoriaVenda').value = ''
            document.getElementById('valorUnitarioVenda').value = ''
            document.getElementById('quantidadeVenda').value = ''
            document.getElementById('descontoVenda').value = '0,00'
            document.getElementById('valorTotalVenda').value = ''
        }
    }
    
    validarQuantidade() {
        const quantidade = parseInt(document.getElementById('quantidadeVenda').value) || 0
        const estoque = parseInt(document.getElementById('quantidadeVenda').dataset.estoque) || 0
        
        if (quantidade > estoque) {
            this.showError(`Quantidade indisponível em estoque. Disponível: ${estoque}`)
            document.getElementById('quantidadeVenda').value = estoque
        }
        
        if (quantidade <= 0) {
            document.getElementById('quantidadeVenda').value = 1
        }
    }
    
    calcularValorTotal() {
        const quantidade = parseInt(document.getElementById('quantidadeVenda').value) || 0
        const valorUnitario = formatters.parseCurrency(
            document.getElementById('valorUnitarioVenda').value
        )
        const desconto = this.obterValorNumerico(document.getElementById('descontoVenda'))
        
        const valorTotal = (quantidade * valorUnitario) - desconto
        
        document.getElementById('valorTotalVenda').value = formatters.formatCurrency(
            Math.max(0, valorTotal)
        )
    }
    
    setDataVenda() {
        const dataInput = document.getElementById('dataVenda')
        if (dataInput) {
            dataInput.value = formatters.formatDateTime(new Date())
        }
    }
    
    setNumeroVenda() {
        const numeroInput = document.getElementById('numeroVenda')
        if (numeroInput) {
            numeroInput.value = this.numeroVenda
        }
    }
    
    adicionarProduto() {
        const select = document.getElementById('descricaoVenda')
        const produtoId = select.value
        
        if (!produtoId) {
            this.showError('Selecione um produto')
            return
        }
        
        const produto = this.produtos.find(p => p.id === produtoId)
        if (!produto) {
            this.showError('Produto não encontrado')
            return
        }
        
        const quantidade = parseInt(document.getElementById('quantidadeVenda').value) || 0
        const valorUnitario = formatters.parseCurrency(document.getElementById('valorUnitarioVenda').value)
        const desconto = this.obterValorNumerico(document.getElementById('descontoVenda'))
        const valorTotal = (quantidade * valorUnitario) - desconto
        
        // Verificar se o produto já está na lista
        const itemExistente = this.itensVenda.find(item => item.produto_id === produtoId)
        if (itemExistente) {
            this.showError('Este produto já foi adicionado à venda')
            return
        }
        
        // Validar estoque
        if (quantidade > produto.quantidade) {
            this.showError(`Quantidade indisponível. Estoque atual: ${produto.quantidade}`)
            return
        }
        
        if (quantidade <= 0) {
            this.showError('Quantidade deve ser maior que zero')
            return
        }
        
        const itemVenda = {
            produto_id: produto.id,
            codigo_produto: produto.codigo_produto,
            descricao_produto: produto.descricao_produto,
            quantidade: quantidade,
            valor_unitario: valorUnitario,
            desconto: desconto,
            valor_total: Math.max(0, valorTotal)
        }
        
        this.itensVenda.push(itemVenda)
        this.renderizarItensVenda()
        this.limparFormProduto()
        this.atualizarTotais()
    }
    
    renderizarItensVenda() {
        const tbody = document.getElementById('tbodyItensVenda')
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        this.itensVenda.forEach((item, index) => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${item.descricao_produto}</td>
                <td>${item.quantidade}</td>
                <td>${formatters.formatCurrency(item.valor_unitario)}</td>
                <td>${formatters.formatCurrency(item.desconto)}</td>
                <td>${formatters.formatCurrency(item.valor_total)}</td>
                <td>
                    <button class="btn-icon" onclick="vendasModule.removerItem(${index})" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `
            tbody.appendChild(tr)
        })
    }
    
    removerItem(index) {
        this.itensVenda.splice(index, 1)
        this.renderizarItensVenda()
        this.atualizarTotais()
    }
    
    atualizarTotais() {
        const totalQuantidade = this.itensVenda.reduce((sum, item) => sum + item.quantidade, 0)
        const totalDesconto = this.itensVenda.reduce((sum, item) => sum + item.desconto, 0)
        const totalVenda = this.itensVenda.reduce((sum, item) => sum + item.valor_total, 0)
        
        document.getElementById('totalQuantidade').textContent = totalQuantidade
        document.getElementById('totalDesconto').textContent = formatters.formatCurrency(totalDesconto)
        document.getElementById('totalVenda').textContent = formatters.formatCurrency(totalVenda)
    }
    
    limparFormProduto() {
        document.getElementById('descricaoVenda').value = ''
        document.getElementById('codigoVenda').value = ''
        document.getElementById('fornecedorVenda').value = ''
        document.getElementById('categoriaVenda').value = ''
        document.getElementById('valorUnitarioVenda').value = ''
        document.getElementById('quantidadeVenda').value = ''
        document.getElementById('descontoVenda').value = '0,00'
        document.getElementById('valorTotalVenda').value = ''
    }
    
    async realizarVenda() {
        if (this.itensVenda.length === 0) {
            this.showError('Adicione pelo menos um produto à venda')
            return
        }
        
        // Validar estoque novamente
        for (const item of this.itensVenda) {
            const produto = this.produtos.find(p => p.id === item.produto_id)
            if (!produto) {
                this.showError(`Produto não encontrado: ${item.descricao_produto}`)
                return
            }
            if (produto.quantidade < item.quantidade) {
                this.showError(`Estoque insuficiente para: ${item.descricao_produto}. Disponível: ${produto.quantidade}`)
                return
            }
        }
        
        try {
            this.showLoading('Realizando venda...')
            
            // Criar a venda principal
            const venda = {
                data_venda: new Date().toISOString(),
                numero_venda: this.numeroVenda,
                codigo_produto: this.itensVenda[0].codigo_produto,
                descricao_produto: this.itensVenda[0].descricao_produto,
                fornecedor: this.produtos.find(p => p.id === this.itensVenda[0].produto_id)?.fornecedor || '',
                categoria: this.produtos.find(p => p.id === this.itensVenda[0].produto_id)?.categoria || '',
                quantidade: this.itensVenda.reduce((sum, item) => sum + item.quantidade, 0),
                valor_unitario: this.itensVenda[0].valor_unitario,
                desconto: this.itensVenda.reduce((sum, item) => sum + item.desconto, 0),
                valor_total: this.itensVenda.reduce((sum, item) => sum + item.valor_total, 0)
            }
            
            // Salvar venda e itens
            const { data, error } = await supabaseService.saveVenda(venda, this.itensVenda)
            
            if (error) {
                this.hideLoading()
                console.error('Erro Supabase:', error)
                this.showError('Erro ao realizar venda: ' + error.message)
                return
            }
            
            // Atualizar estoque dos produtos
            for (const item of this.itensVenda) {
                const produto = this.produtos.find(p => p.id === item.produto_id)
                if (produto) {
                    const novaQuantidade = produto.quantidade - item.quantidade
                    const { error: updateError } = await supabaseService.updateProduto(produto.id, {
                        ...produto,
                        quantidade: novaQuantidade
                    })
                    
                    if (updateError) {
                        console.error('Erro ao atualizar estoque:', updateError)
                    }
                }
            }
            
            this.hideLoading()
            this.showSuccess('Venda realizada com sucesso!')
            this.cancelarVenda()
            await this.carregarProdutos()
            
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao realizar venda:', err)
            this.showError('Erro ao realizar venda: ' + err.message)
        }
    }
    
    cancelarVenda() {
        if (this.itensVenda.length > 0) {
            if (!confirm('Tem certeza que deseja cancelar esta venda?')) {
                return
            }
        }
        
        this.itensVenda = []
        this.limparFormProduto()
        this.renderizarItensVenda()
        this.atualizarTotais()
        this.numeroVenda = this.gerarNumeroVenda()
        this.setNumeroVenda()
        this.setDataVenda()
    }
    
    showLoading(message = 'Processando...') {
        this.hideLoading()
        
        const loading = document.createElement('div')
        loading.id = 'globalLoading'
        loading.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `
        
        loading.innerHTML = `
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            ">
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #8B4513;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                "></div>
                <p style="margin: 0; color: #333; font-size: 16px;">${message}</p>
            </div>
        `
        
        document.body.appendChild(loading)
        
        if (!document.querySelector('#loading-animation')) {
            const style = document.createElement('style')
            style.id = 'loading-animation'
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `
            document.head.appendChild(style)
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('globalLoading')
        if (loading) {
            loading.remove()
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error')
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success')
    }
    
    showNotification(message, type) {
        const existingNotifications = document.querySelectorAll('.notification')
        existingNotifications.forEach(n => n.remove())
        
        const notification = document.createElement('div')
        notification.className = `notification notification-${type}`
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            max-width: 350px;
        `
        
        document.body.appendChild(notification)
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease'
            setTimeout(() => notification.remove(), 300)
        }, 3000)
        
        if (!document.querySelector('#notification-animations')) {
            const style = document.createElement('style')
            style.id = 'notification-animations'
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `
            document.head.appendChild(style)
        }
    }
}

export const vendasModule = new VendasModule()