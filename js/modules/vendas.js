// js/modules/vendas.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'
import * as validators from '../utils/validators.js'

class VendasModule {
    constructor() {
        this.produtos = []
        this.itensVenda = []
        this.vendaAtual = null
        this.vendaEditando = null
        this.numeroVenda = this.gerarNumeroVenda()
    }
    
    async init() {
        await this.carregarProdutos()
        this.setupEventListeners()
        this.setDataVenda()
        this.setNumeroVenda()
        this.setDataVendasDia()
        await this.carregarVendasDoDia()
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
        
        const quantidade = document.getElementById('quantidadeVenda')
        const desconto = document.getElementById('descontoVenda')
        
        if (quantidade) {
            quantidade.addEventListener('input', () => {
                this.calcularValorTotal()
                this.validarQuantidade()
            })
            
            quantidade.addEventListener('blur', () => {
                const qtd = parseInt(quantidade.value) || 0
                if (qtd < 1) {
                    quantidade.value = 1
                    this.calcularValorTotal()
                }
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
        
        const form = document.getElementById('formVendas')
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault()
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
    
    parseCurrency(value) {
        if (!value) return 0
        if (typeof value === 'number') return value
        
        const strValue = String(value)
            .replace('R$', '')
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .trim()
        
        return parseFloat(strValue) || 0
    }
    
    onProdutoSelecionado(select) {
        const selectedOption = select.options[select.selectedIndex]
        
        if (select.value) {
            document.getElementById('codigoVenda').value = selectedOption.dataset.codigo || ''
            document.getElementById('fornecedorVenda').value = selectedOption.dataset.fornecedor || ''
            document.getElementById('categoriaVenda').value = selectedOption.dataset.categoria || ''
            
            const valor = parseFloat(selectedOption.dataset.valor) || 0
            const valorUnitarioInput = document.getElementById('valorUnitarioVenda')
            if (valorUnitarioInput) {
                valorUnitarioInput.value = formatters.formatCurrency(valor)
            }
            
            const quantidadeInput = document.getElementById('quantidadeVenda')
            if (quantidadeInput) {
                quantidadeInput.max = selectedOption.dataset.estoque || 0
                quantidadeInput.dataset.estoque = selectedOption.dataset.estoque || 0
                quantidadeInput.value = 1
            }
            
            this.calcularValorTotal()
        } else {
            this.limparFormProduto()
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
        
        const valorUnitarioInput = document.getElementById('valorUnitarioVenda')
        let valorUnitario = 0
        
        if (valorUnitarioInput && valorUnitarioInput.value) {
            const valorLimpo = valorUnitarioInput.value
                .replace('R$', '')
                .replace(/\s/g, '')
                .replace(/\./g, '')
                .replace(',', '.')
                .trim()
            valorUnitario = parseFloat(valorLimpo) || 0
        }
        
        const desconto = this.obterValorNumerico(document.getElementById('descontoVenda'))
        const valorTotal = (quantidade * valorUnitario) - desconto
        
        const valorTotalInput = document.getElementById('valorTotalVenda')
        if (valorTotalInput) {
            valorTotalInput.value = formatters.formatCurrency(Math.max(0, valorTotal))
        }
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
    
    setDataVendasDia() {
        const dataSpan = document.getElementById('dataVendasDia')
        if (dataSpan) {
            dataSpan.textContent = formatters.formatDate(new Date())
        }
    }
    
    async carregarVendasDoDia() {
        try {
            const { data, error } = await supabaseService.getVendas()
            
            if (error) {
                console.error('Erro ao carregar vendas:', error)
                return
            }
            
            const hoje = new Date()
            const dataHoje = hoje.toISOString().split('T')[0]
            
            const vendasDoDia = (data || []).filter(venda => {
                const dataVenda = new Date(venda.data_venda).toISOString().split('T')[0]
                return dataVenda === dataHoje
            })
            
            this.renderizarVendasDoDia(vendasDoDia)
        } catch (err) {
            console.error('Erro ao carregar vendas do dia:', err)
        }
    }
    
    renderizarVendasDoDia(vendas) {
        const tbody = document.getElementById('tbodyVendasDia')
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        if (vendas.length === 0) {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td colspan="8" style="text-align: center; padding: 20px; color: #999;">
                    <i class="fas fa-info-circle"></i> Nenhuma venda realizada hoje
                </td>
            `
            tbody.appendChild(tr)
            
            document.getElementById('totalQuantidadeDia').textContent = '0'
            document.getElementById('totalVendasDia').textContent = formatters.formatCurrency(0)
            return
        }
        
        let totalQuantidade = 0
        let totalVendas = 0
        
        const vendasOrdenadas = [...vendas].sort((a, b) => 
            new Date(b.data_venda) - new Date(a.data_venda)
        )
        
        vendasOrdenadas.forEach(venda => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${formatters.formatDateTime(venda.data_venda)}</td>
                <td>${venda.numero_venda || '-'}</td>
                <td>${venda.descricao_produto || '-'}</td>
                <td>${venda.fornecedor || '-'}</td>
                <td>${venda.categoria || '-'}</td>
                <td>${venda.quantidade || 0}</td>
                <td>${formatters.formatCurrency(venda.valor_total)}</td>
                <td>
                    <button class="btn-icon" onclick="vendasModule.editarVenda('${venda.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="vendasModule.excluirVenda('${venda.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `
            tbody.appendChild(tr)
            
            totalQuantidade += venda.quantidade || 0
            totalVendas += parseFloat(venda.valor_total) || 0
        })
        
        document.getElementById('totalQuantidadeDia').textContent = totalQuantidade
        document.getElementById('totalVendasDia').textContent = formatters.formatCurrency(totalVendas)
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
        const valorUnitario = this.parseCurrency(document.getElementById('valorUnitarioVenda').value)
        const desconto = this.obterValorNumerico(document.getElementById('descontoVenda'))
        const valorTotal = (quantidade * valorUnitario) - desconto
        
        const itemExistente = this.itensVenda.find(item => item.produto_id === produtoId)
        if (itemExistente) {
            this.showError('Este produto já foi adicionado à venda')
            return
        }
        
        // Verificar estoque considerando edição
        let quantidadeDisponivel = produto.quantidade
        if (this.vendaEditando) {
            const itemOriginal = this.itensVenda.find(i => i.produto_id === produtoId)
            if (itemOriginal) {
                quantidadeDisponivel += itemOriginal.quantidade
            }
        }
        
        if (quantidade > quantidadeDisponivel) {
            this.showError(`Quantidade indisponível. Estoque atual: ${quantidadeDisponivel}`)
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
        const selectProduto = document.getElementById('descricaoVenda')
        if (selectProduto) selectProduto.value = ''
        
        const campos = ['codigoVenda', 'fornecedorVenda', 'categoriaVenda']
        campos.forEach(id => {
            const campo = document.getElementById(id)
            if (campo) campo.value = ''
        })
        
        const valorUnitario = document.getElementById('valorUnitarioVenda')
        if (valorUnitario) valorUnitario.value = ''
        
        const quantidade = document.getElementById('quantidadeVenda')
        if (quantidade) quantidade.value = ''
        
        const desconto = document.getElementById('descontoVenda')
        if (desconto) desconto.value = '0,00'
        
        const valorTotal = document.getElementById('valorTotalVenda')
        if (valorTotal) valorTotal.value = ''
    }
    
    async realizarVenda() {
        if (this.itensVenda.length === 0) {
            this.showError('Adicione pelo menos um produto à venda')
            return
        }
        
        // Validar estoque
        for (const item of this.itensVenda) {
            const produto = this.produtos.find(p => p.id === item.produto_id)
            if (!produto) {
                this.showError(`Produto não encontrado: ${item.descricao_produto}`)
                return
            }
            
            let quantidadeOriginal = 0
            if (this.vendaEditando) {
                // Buscar quantidade original deste produto na venda
                const { data: itensOriginais } = await supabaseService.getItensVenda(this.vendaEditando.id)
                const itemOriginal = itensOriginais?.find(i => i.produto_id === item.produto_id)
                quantidadeOriginal = itemOriginal?.quantidade || 0
            }
            
            const quantidadeNecessaria = item.quantidade - quantidadeOriginal
            if (quantidadeNecessaria > 0 && produto.quantidade < quantidadeNecessaria) {
                this.showError(`Estoque insuficiente para: ${item.descricao_produto}. Disponível: ${produto.quantidade}`)
                return
            }
        }
        
        try {
            this.showLoading(this.vendaEditando ? 'Atualizando venda...' : 'Realizando venda...')
            
            if (this.vendaEditando) {
                await this.atualizarVendaExistente()
            } else {
                await this.criarNovaVenda()
            }
            
            this.hideLoading()
            this.showSuccess(this.vendaEditando ? 'Venda atualizada com sucesso!' : 'Venda realizada com sucesso!')
            
            this.cancelarVenda()
            await this.carregarProdutos()
            await this.carregarVendasDoDia()
            
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao realizar venda:', err)
            this.showError('Erro ao realizar venda: ' + err.message)
        }
    }
    
    async criarNovaVenda() {
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
        
        const { error } = await supabaseService.saveVenda(venda, this.itensVenda)
        
        if (error) throw error
        
        for (const item of this.itensVenda) {
            const produto = this.produtos.find(p => p.id === item.produto_id)
            if (produto) {
                const novaQuantidade = produto.quantidade - item.quantidade
                await supabaseService.updateProduto(produto.id, {
                    ...produto,
                    quantidade: novaQuantidade
                })
            }
        }
    }
    
    async atualizarVendaExistente() {
        // Devolver itens antigos ao estoque
        const { data: itensAntigos } = await supabaseService.getItensVenda(this.vendaEditando.id)
        
        if (itensAntigos) {
            for (const item of itensAntigos) {
                const produto = this.produtos.find(p => p.id === item.produto_id)
                if (produto) {
                    const novaQuantidade = produto.quantidade + item.quantidade
                    await supabaseService.updateProduto(produto.id, {
                        ...produto,
                        quantidade: novaQuantidade
                    })
                }
            }
        }
        
        // Atualizar venda
        const vendaAtualizada = {
            data_venda: this.vendaEditando.data_venda,
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
        
        await supabaseService.updateVenda(this.vendaEditando.id, vendaAtualizada)
        
        // Excluir itens antigos
        await supabaseService.deleteItensVenda(this.vendaEditando.id)
        
        // Inserir novos itens
        const itensParaInserir = this.itensVenda.map(item => ({
            ...item,
            venda_id: this.vendaEditando.id
        }))
        
        const { error } = await supabaseService.saveItensVenda(itensParaInserir)
        if (error) throw error
        
        // Subtrair novos itens do estoque
        for (const item of this.itensVenda) {
            const produto = this.produtos.find(p => p.id === item.produto_id)
            if (produto) {
                const novaQuantidade = produto.quantidade - item.quantidade
                await supabaseService.updateProduto(produto.id, {
                    ...produto,
                    quantidade: novaQuantidade
                })
            }
        }
    }
    
    async editarVenda(id) {
        try {
            this.showLoading('Carregando venda...')
            
            const { data: vendas, error } = await supabaseService.getVendas()
            
            if (error) {
                this.hideLoading()
                this.showError('Erro ao carregar venda: ' + error.message)
                return
            }
            
            const venda = vendas.find(v => v.id === id)
            if (!venda) {
                this.hideLoading()
                this.showError('Venda não encontrada')
                return
            }
            
            const { data: itens, error: itensError } = await supabaseService.getItensVenda(id)
            
            this.hideLoading()
            
            if (itensError) {
                this.showError('Erro ao carregar itens da venda')
                return
            }
            
            this.vendaEditando = venda
            this.numeroVenda = venda.numero_venda
            this.setNumeroVenda()
            
            this.itensVenda = (itens || []).map(item => ({
                produto_id: item.produto_id,
                codigo_produto: item.codigo_produto,
                descricao_produto: item.descricao_produto,
                quantidade: item.quantidade,
                valor_unitario: item.valor_unitario,
                desconto: item.desconto,
                valor_total: item.valor_total
            }))
            
            this.renderizarItensVenda()
            this.atualizarTotais()
            
            this.showSuccess('Venda carregada para edição')
            
            document.querySelector('.card')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            })
            
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao editar venda:', err)
            this.showError('Erro ao carregar venda')
        }
    }
    
    async excluirVenda(id) {
        if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) {
            return
        }
        
        try {
            this.showLoading('Excluindo venda...')
            
            const { data: itens, error: itensError } = await supabaseService.getItensVenda(id)
            
            if (!itensError && itens) {
                for (const item of itens) {
                    const produto = this.produtos.find(p => p.id === item.produto_id)
                    if (produto) {
                        const novaQuantidade = produto.quantidade + item.quantidade
                        await supabaseService.updateProduto(produto.id, {
                            ...produto,
                            quantidade: novaQuantidade
                        })
                    }
                }
            }
            
            await supabaseService.deleteItensVenda(id)
            const { error } = await supabaseService.deleteVenda(id)
            
            this.hideLoading()
            
            if (error) {
                this.showError('Erro ao excluir venda: ' + error.message)
                return
            }
            
            this.showSuccess('Venda excluída com sucesso!')
            await this.carregarProdutos()
            await this.carregarVendasDoDia()
            
            if (this.vendaEditando?.id === id) {
                this.cancelarVenda()
            }
            
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao excluir venda:', err)
            this.showError('Erro ao excluir venda')
        }
    }
    
    atualizarListaVendas() {
        this.carregarVendasDoDia()
        this.showSuccess('Lista atualizada!')
    }
    
    cancelarVenda() {
        if (this.itensVenda.length > 0 || this.vendaEditando) {
            const mensagem = this.vendaEditando ? 
                'Cancelar edição da venda?' : 
                'Cancelar esta venda?'
            
            if (!confirm(mensagem)) {
                return
            }
        }
        
        this.itensVenda = []
        this.vendaEditando = null
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