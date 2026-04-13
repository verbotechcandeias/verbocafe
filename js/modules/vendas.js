// js/modules/vendas.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'
import * as validators from '../utils/validators.js'
import * as dateTime from '../utils/datetime.js'

class VendasModule {
    constructor() {
        this.produtos = []
        this.itensVenda = []
        this.vendaAtual = null
        this.vendaEditando = null
        this.numeroVenda = this.gerarNumeroVenda()
        this.compras = []
        this.formaPagamento = 'Pendente'
        this.descricaoPendente = ''
    }

    showConfirm(options = {}) {
        const {
            title = 'Confirmar ação',
            message = 'Tem certeza que deseja continuar?',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            type = 'warning', // 'warning', 'danger', 'info'
            icon = 'fa-exclamation-triangle'
        } = options
        
        return new Promise((resolve) => {
            // Criar overlay
            const overlay = document.createElement('div')
            overlay.className = 'modal-confirm-overlay'
            
            // Criar modal
            const modal = document.createElement('div')
            modal.className = 'modal-confirm'
            
            // Determinar classe do ícone
            let iconClass = 'warning'
            if (type === 'danger') iconClass = 'danger'
            else if (type === 'info') iconClass = 'info'
            
            // Determinar classe do botão confirmar
            let confirmBtnClass = 'modal-confirm-btn confirm'
            if (type === 'warning') confirmBtnClass += ' warning-btn'
            
            modal.innerHTML = `
                <div class="modal-confirm-header">
                    <div class="modal-confirm-icon ${iconClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="modal-confirm-title">${title}</div>
                </div>
                <div class="modal-confirm-message">${message}</div>
                <div class="modal-confirm-actions">
                    <button class="modal-confirm-btn cancel-btn">
                        <i class="fas fa-times"></i> ${cancelText}
                    </button>
                    <button class="${confirmBtnClass}">
                        <i class="fas fa-check"></i> ${confirmText}
                    </button>
                </div>
            `
            
            overlay.appendChild(modal)
            document.body.appendChild(overlay)
            
            // Event listeners
            const cancelBtn = modal.querySelector('.cancel-btn')
            const confirmBtn = modal.querySelector('.confirm')
            
            const closeModal = (result) => {
                overlay.style.animation = 'fadeIn 0.2s ease reverse'
                setTimeout(() => {
                    overlay.remove()
                    resolve(result)
                }, 200)
            }
            
            cancelBtn.addEventListener('click', () => closeModal(false))
            confirmBtn.addEventListener('click', () => closeModal(true))
            
            // Fechar ao clicar fora
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(false)
                }
            })
            
            // Fechar com tecla ESC
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false)
                    document.removeEventListener('keydown', handleEsc)
                }
            }
            document.addEventListener('keydown', handleEsc)
            
            // Focar no botão cancelar
            setTimeout(() => cancelBtn.focus(), 100)
        })
    }

    async carregarCompras() {
        try {
            const { data, error } = await supabaseService.getCompras()
            
            if (error) {
                console.error('Erro ao carregar compras:', error)
                return
            }
            
            this.compras = data || []
            console.log('Compras carregadas:', this.compras.length)
        } catch (err) {
            console.error('Erro ao carregar compras:', err)
        }
    }
    
    async init() {
        await this.carregarProdutos()
        await this.carregarCompras() 
        this.setupEventListeners()
        this.setDataVenda()
        this.setNumeroVenda()
        this.setDataVendasDia()
        await this.carregarVendasDoDia()
    }
    
    gerarNumeroVenda() {
        const agora = dateTime.getDataHoraBrasilia()
        const year = agora.getFullYear()
        const month = String(agora.getMonth() + 1).padStart(2, '0')
        const day = String(agora.getDate()).padStart(2, '0')
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
        
        // Listener para forma de pagamento
        const formaPagamento = document.getElementById('formaPagamentoVenda')
        if (formaPagamento) {
            formaPagamento.addEventListener('change', (e) => {
                this.formaPagamento = e.target.value
                this.toggleDescricaoPendente(e.target.value)
                validators.clearValidationError(e.target)
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

    toggleDescricaoPendente(formaPagamento) {
        const container = document.getElementById('descricaoPendenteContainer')
        const descricaoInput = document.getElementById('descricaoPendente')
        
        if (container) {
            if (formaPagamento === 'Pendente') {
                container.style.display = 'block'
                if (descricaoInput) {
                    descricaoInput.required = true
                    // Se estiver editando, preencher com a descrição salva
                    if (this.vendaEditando && this.vendaEditando.descricao_pendente) {
                        descricaoInput.value = this.vendaEditando.descricao_pendente
                    }
                }
            } else {
                container.style.display = 'none'
                if (descricaoInput) {
                    descricaoInput.required = false
                    descricaoInput.value = ''
                }
            }
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
            // Usar a função que retorna a data/hora formatada para exibição
            dataInput.value = dateTime.getAgoraFormatado()
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
            dataSpan.textContent = dateTime.formatDate(new Date())
        }
    }
    
    async carregarVendasDoDia() {
        try {
            console.log('Carregando itens de vendas do dia...')
            
            const dataHoje = dateTime.getHojeISO()
            
            const { data: vendas, error: vendasError } = await supabaseService.getVendas()
            
            if (vendasError) {
                console.error('Erro ao carregar vendas:', vendasError)
                return
            }
            
            const vendasDoDia = (vendas || []).filter(venda => {
                if (!venda.data_venda) return false
                const dataVenda = dateTime.extrairDataLocal(venda.data_venda)
                return dataVenda === dataHoje
            })
            
            console.log('Vendas do dia encontradas:', vendasDoDia.length)
            
            const todosItens = []
            
            for (const venda of vendasDoDia) {
                const { data: itens, error: itensError } = await supabaseService.getItensVenda(venda.id)
                
                if (itensError) {
                    console.error('Erro ao carregar itens da venda:', venda.id, itensError)
                    continue
                }
                
                if (itens && itens.length > 0) {
                    const itensComVenda = itens.map(item => ({
                        ...item,
                        venda_id: venda.id,
                        numero_venda: venda.numero_venda,
                        data_venda: venda.data_venda,
                        fornecedor: item.fornecedor || this.getFornecedorProduto(item.produto_id),
                        categoria: item.categoria || this.getCategoriaProduto(item.produto_id),
                        forma_pagamento: venda.forma_pagamento || item.forma_pagamento || '-',
                        descricao_pendente: venda.descricao_pendente || item.descricao_pendente || null  // Incluir descrição
                    }))
                    
                    todosItens.push(...itensComVenda)
                }
            }
            
            console.log('Total de itens encontrados:', todosItens.length)
            
            this.renderizarVendasDoDia(todosItens)
            
        } catch (err) {
            console.error('Erro ao carregar vendas do dia:', err)
        }
    }
    
    renderizarVendasDoDia(itens) {
        const tbody = document.getElementById('tbodyVendasDia')
        if (!tbody) {
            console.error('Elemento tbodyVendasDia não encontrado')
            return
        }
        
        console.log('Renderizando', itens.length, 'itens de venda')
        
        tbody.innerHTML = ''
        
        if (!itens || itens.length === 0) {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td colspan="10" style="text-align: center; padding: 20px; color: #999;">
                    <i class="fas fa-info-circle"></i> Nenhuma venda realizada hoje
                </td>
            `
            tbody.appendChild(tr)
            
            const totalQtd = document.getElementById('totalQuantidadeDia')
            const totalValor = document.getElementById('totalVendasDia')
            if (totalQtd) totalQtd.textContent = '0'
            if (totalValor) totalValor.textContent = formatters.formatCurrency(0)
            return
        }
        
        let totalQuantidade = 0
        let totalVendas = 0
        
        // Ordenar por data/hora (mais recente primeiro)
        const itensOrdenados = [...itens].sort((a, b) => {
            const dataA = new Date(a.data_venda)
            const dataB = new Date(b.data_venda)
            return dataB - dataA
        })
        
        itensOrdenados.forEach(item => {
            const tr = document.createElement('tr')
            
            // CORREÇÃO: Usar dateTime.formatDateTime para converter UTC -> Brasília
            let dataHora = '-'
            if (item.data_venda) {
                dataHora = dateTime.formatDateTime(item.data_venda)
            }
            
            const valorTotal = parseFloat(item.valor_total) || 0
            const fornecedor = item.fornecedor || this.getFornecedorProduto(item.produto_id) || '-'
            const categoria = item.categoria || this.getCategoriaProduto(item.produto_id) || '-'
            const formaPagamento = item.forma_pagamento || '-'
            const descricao = item.descricao_pendente || '-'
            
            // Definir classe de cor para forma de pagamento
            let formaPagamentoClass = ''
            if (formaPagamento === 'Pendente') {
                formaPagamentoClass = 'badge badge-warning'
            } else if (formaPagamento === 'PIX' || formaPagamento === 'Dinheiro') {
                formaPagamentoClass = 'badge badge-success'
            } else if (formaPagamento.includes('Cartão')) {
                formaPagamentoClass = 'badge badge-info'
            } else {
                formaPagamentoClass = 'badge badge-secondary'
            }
            
            // Truncar descrição se for muito longa
            const descricaoExibida = descricao.length > 30 
                ? descricao.substring(0, 30) + '...' 
                : descricao
            
            tr.innerHTML = `
                <td>${dataHora}</td>
                <td>${item.numero_venda || '-'}</td>
                <td>${item.descricao_produto || '-'}</td>
                <td>${fornecedor}</td>
                <td>${categoria}</td>
                <td>${item.quantidade || 0}</td>
                <td>${formatters.formatCurrency(valorTotal)}</td>
                <td><span class="${formaPagamentoClass}">${formaPagamento}</span></td>
                <td title="${descricao}">${descricaoExibida}</td>
                <td>
                    <button class="btn-icon" onclick="vendasModule.editarItemVenda('${item.venda_id}', '${item.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="vendasModule.excluirItemVenda('${item.venda_id}', '${item.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `
            tbody.appendChild(tr)
            
            totalQuantidade += item.quantidade || 0
            totalVendas += valorTotal
        })
        
        const totalQtd = document.getElementById('totalQuantidadeDia')
        const totalValor = document.getElementById('totalVendasDia')
        
        if (totalQtd) totalQtd.textContent = totalQuantidade
        if (totalValor) totalValor.textContent = formatters.formatCurrency(totalVendas)
        
        console.log('Totais:', { totalQuantidade, totalVendas })
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
            this.showError('Este produto já foi adicionado à venda. Edite a quantidade na lista abaixo.')
            return
        }
        
        // Verificar estoque
        let quantidadeDisponivel = produto.quantidade
        if (this.vendaEditando) {
            quantidadeDisponivel = 999
        }
        
        if (quantidade > quantidadeDisponivel) {
            this.showError(`Quantidade indisponível. Estoque atual: ${quantidadeDisponivel}`)
            return
        }
        
        if (quantidade <= 0) {
            this.showError('Quantidade deve ser maior que zero')
            return
        }
        
        // Buscar o valor de compra do produto
        const valorCompra = this.buscarValorCompraProduto(produto.codigo_produto)
        
        console.log('Adicionando produto:', {
            produto: produto.descricao_produto,
            codigo: produto.codigo_produto,
            valorCompra: valorCompra
        })
        
        const itemVenda = {
            produto_id: produto.id,
            codigo_produto: produto.codigo_produto,
            descricao_produto: produto.descricao_produto,
            fornecedor: produto.fornecedor,
            categoria: produto.categoria,
            quantidade: quantidade,
            valor_unitario: valorUnitario,
            valor_compra: valorCompra,           // Adicionar valor de compra
            desconto: desconto,
            valor_total: Math.max(0, valorTotal)
        }
        
        this.itensVenda.push(itemVenda)
        this.renderizarItensVenda()
        this.limparFormProduto()
        this.atualizarTotais()
    }

    // Adicionar método para buscar valor de compra
    buscarValorCompraProduto(codigoProduto) {
        if (!codigoProduto) {
            console.log('Código do produto não fornecido')
            return 0
        }
        
        // Filtrar compras pelo código do produto
        const comprasProduto = this.compras.filter(c => c.codigo_produto === codigoProduto)
        
        if (comprasProduto.length === 0) {
            console.log(`Nenhuma compra encontrada para o produto: ${codigoProduto}`)
            return 0
        }
        
        // Ordenar por data (mais recente primeiro)
        comprasProduto.sort((a, b) => new Date(b.data_compra) - new Date(a.data_compra))
        
        // Retornar o valor da compra mais recente
        const valorCompra = parseFloat(comprasProduto[0].valor_compra) || 0
        console.log(`Valor de compra encontrado para ${codigoProduto}: R$ ${valorCompra}`)
        
        return valorCompra
    }

    renderizarItensVenda() {
        const tbody = document.getElementById('tbodyItensVenda')
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        this.itensVenda.forEach((item, index) => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>
                    <div>
                        <strong>${item.descricao_produto}</strong><br>
                        <small style="color: #666;">${item.fornecedor || '-'} | ${item.categoria || '-'}</small>
                    </div>
                </td>
                <td>
                    <div class="quantidade-editor">
                        <button class="btn-qtd" onclick="vendasModule.diminuirQuantidade(${index})" title="Diminuir">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" 
                            class="input-qtd" 
                            value="${item.quantidade}" 
                            min="1" 
                            max="${this.getEstoqueDisponivel(item.produto_id)}"
                            onchange="vendasModule.atualizarQuantidadeItem(${index}, this.value)"
                            onclick="this.select()">
                        <button class="btn-qtd" onclick="vendasModule.aumentarQuantidade(${index})" title="Aumentar">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td>${formatters.formatCurrency(item.valor_unitario)}</td>
                <td>
                    <input type="text" 
                        class="input-desconto" 
                        value="${formatters.formatCurrency(item.desconto)}" 
                        onchange="vendasModule.atualizarDescontoItem(${index}, this.value)"
                        onclick="this.select()">
                </td>
                <td>${formatters.formatCurrency(item.valor_total)}</td>
                <td>
                    <button class="btn-icon" onclick="vendasModule.removerItem(${index})" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `
            tbody.appendChild(tr)
        })
        
        this.adicionarEstilosQuantidade()
    }

    // Adicionar método para estilos
    adicionarEstilosQuantidade() {
        if (document.querySelector('#qtd-editor-styles')) return
        
        const style = document.createElement('style')
        style.id = 'qtd-editor-styles'
        style.textContent = `
            .quantidade-editor {
                display: flex;
                align-items: center;
                gap: 5px;
                min-width: 120px;
            }
            
            .btn-qtd {
                width: 32px;
                height: 32px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                font-size: 12px;
                color: #666;
            }
            
            .btn-qtd:hover {
                background: #f0f0f0;
                border-color: #8B4513;
                color: #8B4513;
            }
            
            .input-qtd {
                width: 60px;
                height: 32px;
                text-align: center;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                padding: 0 5px;
            }
            
            .input-qtd:focus {
                outline: none;
                border-color: #8B4513;
                box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
            }
            
            .input-desconto {
                width: 100px;
                height: 32px;
                text-align: right;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                padding: 0 8px;
            }
            
            .input-desconto:focus {
                outline: none;
                border-color: #8B4513;
                box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
            }
            
            /* Remover setas do input number */
            .input-qtd::-webkit-outer-spin-button,
            .input-qtd::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            
            .input-qtd[type=number] {
                -moz-appearance: textfield;
                appearance: textfield;
            }
        `
        document.head.appendChild(style)
    }

    // Método para obter estoque disponível
    getEstoqueDisponivel(produtoId) {
        const produto = this.produtos.find(p => p.id === produtoId)
        if (!produto) return 999
        
        // Se estiver editando, considerar a quantidade já alocada
        let estoqueBase = produto.quantidade
        
        if (this.vendaEditando) {
            // Na edição, o estoque já considera os itens originais
            return 999 // Permitir qualquer quantidade durante edição
        }
        
        return estoqueBase
    }

    // Aumentar quantidade
    aumentarQuantidade(index) {
        const item = this.itensVenda[index]
        if (!item) return false
        
        const produto = this.produtos.find(p => p.id === item.produto_id)
        if (!produto) return false
        
        // Calcular estoque disponível considerando a edição
        let estoqueDisponivel = produto.quantidade
        
        // Se estiver editando, o estoque já foi devolvido? Não, ainda não!
        // O estoque só será atualizado ao SALVAR a edição
        // Durante a edição, podemos permitir qualquer quantidade
        if (this.vendaEditando) {
            estoqueDisponivel = 999 // Permitir qualquer quantidade durante edição
        }
        
        if (item.quantidade < estoqueDisponivel) {
            item.quantidade++
            this.recalcularItem(item)
            this.renderizarItensVenda()
            this.atualizarTotais()
        } else {
            this.showError(`Quantidade máxima disponível: ${estoqueDisponivel}`)
        }
        return false
    }

    // Diminuir quantidade
    diminuirQuantidade(index) {
        const item = this.itensVenda[index]
        if (!item) return false
        
        if (item.quantidade > 1) {
            item.quantidade--
            this.recalcularItem(item)
            this.renderizarItensVenda()
            this.atualizarTotais()
        }
        return false
    }

    // Atualizar quantidade pelo input
    atualizarQuantidadeItem(index, novaQuantidade) {
        const item = this.itensVenda[index]
        if (!item) return
        
        let quantidade = parseInt(novaQuantidade) || 1
        
        if (quantidade < 1) {
            quantidade = 1
        }
        
        const produto = this.produtos.find(p => p.id === item.produto_id)
        if (produto) {
            let estoqueDisponivel = produto.quantidade
            
            if (this.vendaEditando) {
                estoqueDisponivel = 999 // Permitir qualquer quantidade durante edição
            }
            
            if (quantidade > estoqueDisponivel) {
                this.showError(`Quantidade máxima disponível: ${estoqueDisponivel}`)
                quantidade = estoqueDisponivel
            }
        }
        
        item.quantidade = quantidade
        this.recalcularItem(item)
        this.renderizarItensVenda()
        this.atualizarTotais()
    }

    // Atualizar desconto pelo input
    atualizarDescontoItem(index, novoDesconto) {
        const item = this.itensVenda[index]
        if (!item) return
        
        // Parse do valor do desconto
        let desconto = this.parseCurrency(novoDesconto)
        
        if (isNaN(desconto) || desconto < 0) {
            desconto = 0
        }
        
        // Validar se o desconto não é maior que o valor total
        const valorBruto = item.quantidade * item.valor_unitario
        if (desconto > valorBruto) {
            desconto = valorBruto
            this.showError('Desconto não pode ser maior que o valor total')
        }
        
        item.desconto = desconto
        this.recalcularItem(item)
        this.renderizarItensVenda()
        this.atualizarTotais()
    }

    // Recalcular valor total do item
    recalcularItem(item) {
        const valorBruto = item.quantidade * item.valor_unitario
        item.valor_total = Math.max(0, valorBruto - (item.desconto || 0))
    }

    async removerItem(index) {
        const item = this.itensVenda[index]
        if (!item) return
        
        const confirmado = await this.showConfirm({
            title: 'Remover Item',
            message: `Deseja remover "${item.descricao_produto}" da venda?`,
            confirmText: 'Remover',
            cancelText: 'Cancelar',
            type: 'warning',
            icon: 'fa-trash-alt'
        })
        
        if (confirmado) {
            this.itensVenda.splice(index, 1)
            this.renderizarItensVenda()
            this.atualizarTotais()
            this.showSuccess('Item removido da venda')
        }
    }

    // Atualizar o método atualizarTotais para formato correto
    atualizarTotais() {
        const totalQuantidade = this.itensVenda.reduce((sum, item) => sum + item.quantidade, 0)
        const totalDesconto = this.itensVenda.reduce((sum, item) => sum + (item.desconto || 0), 0)
        const totalVenda = this.itensVenda.reduce((sum, item) => sum + (item.valor_total || 0), 0)
        
        const totalQtdEl = document.getElementById('totalQuantidade')
        const totalDescEl = document.getElementById('totalDesconto')
        const totalVendaEl = document.getElementById('totalVenda')
        
        if (totalQtdEl) totalQtdEl.textContent = totalQuantidade
        if (totalDescEl) totalDescEl.textContent = formatters.formatCurrency(totalDesconto)
        if (totalVendaEl) totalVendaEl.textContent = formatters.formatCurrency(totalVenda)
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

    alternarBotoesVenda(modoEdicao) {
        const btnRealizar = document.getElementById('btnRealizarVenda')
        const btnAlterar = document.getElementById('btnAlterarVenda')
        
        if (btnRealizar && btnAlterar) {
            if (modoEdicao) {
                btnRealizar.style.display = 'none'
                btnAlterar.style.display = 'inline-flex'
            } else {
                btnRealizar.style.display = 'inline-flex'
                btnAlterar.style.display = 'none'
            }
        }
    }

    /**
     * Confirma a alteração da venda (chamado pelo botão Alterar Venda)
     */
    async confirmarAlteracao() {
        if (this.itensVenda.length === 0) {
            this.showError('Adicione pelo menos um produto à venda')
            return
        }
        
        // Validar forma de pagamento
        const formaPagamentoSelect = document.getElementById('formaPagamentoVenda')
        const formaPagamento = formaPagamentoSelect?.value
        
        if (!formaPagamento) {
            this.showError('Selecione a forma de pagamento')
            if (formaPagamentoSelect) {
                validators.showValidationError(formaPagamentoSelect, 'Selecione a forma de pagamento')
                formaPagamentoSelect.focus()
            }
            return
        }
        
        // Validar descrição se for Pendente
        if (formaPagamento === 'Pendente') {
            const descricaoInput = document.getElementById('descricaoPendente')
            const descricao = descricaoInput?.value?.trim()
            
            if (!descricao) {
                this.showError('Informe a descrição/motivo do pendente')
                if (descricaoInput) {
                    validators.showValidationError(descricaoInput, 'Descrição é obrigatória para vendas pendentes')
                    descricaoInput.focus()
                }
                return
            }
            this.descricaoPendente = descricao
        }
        
        try {
            this.showLoading('Atualizando venda...')
            
            await this.atualizarVendaExistente()
            
            this.hideLoading()
            this.showSuccess('Venda alterada com sucesso!')
            
            this.limparVenda()
            this.alternarBotoesVenda(false)
            
            await this.carregarProdutos()
            await this.carregarVendasDoDia()
            
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao alterar venda:', err)
            this.showError('Erro ao alterar venda: ' + err.message)
        }
    }
    
    async realizarVenda() {
        if (this.vendaEditando) {
            this.showError('Use o botão "Alterar Venda" para confirmar as alterações')
            return
        }
        
        if (this.itensVenda.length === 0) {
            this.showError('Adicione pelo menos um produto à venda')
            return
        }
        
        // Validar forma de pagamento
        const formaPagamentoSelect = document.getElementById('formaPagamentoVenda')
        const formaPagamento = formaPagamentoSelect?.value
        
        if (!formaPagamento) {
            this.showError('Selecione a forma de pagamento')
            if (formaPagamentoSelect) {
                validators.showValidationError(formaPagamentoSelect, 'Selecione a forma de pagamento')
                formaPagamentoSelect.focus()
            }
            return
        }
        
        // Validar descrição se for Pendente
        if (formaPagamento === 'Pendente') {
            const descricaoInput = document.getElementById('descricaoPendente')
            const descricao = descricaoInput?.value?.trim()
            
            if (!descricao) {
                this.showError('Informe a descrição/motivo do pendente')
                if (descricaoInput) {
                    validators.showValidationError(descricaoInput, 'Descrição é obrigatória para vendas pendentes')
                    descricaoInput.focus()
                }
                return
            }
            this.descricaoPendente = descricao
        }
        
        // Validar estoque
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
            
            await this.criarNovaVenda()
            
            this.hideLoading()
            this.showSuccess('Venda realizada com sucesso!')
            
            this.limparVenda()
            
            await this.carregarProdutos()
            await this.carregarVendasDoDia()
            
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao realizar venda:', err)
            this.showError('Erro ao realizar venda: ' + err.message)
        }
    }

    // Novo método para limpar a venda sem confirmação (usado após realizar venda com sucesso)
    limparVenda() {
        this.itensVenda = []
        this.vendaEditando = null
        this.limparFormProduto()
        this.renderizarItensVenda()
        this.atualizarTotais()
        this.numeroVenda = this.gerarNumeroVenda()
        this.setNumeroVenda()
        this.setDataVenda()
        this.descricaoPendente = ''
        
        // Resetar forma de pagamento
        const formaPagamento = document.getElementById('formaPagamentoVenda')
        if (formaPagamento) {
            formaPagamento.value = ''
            this.formaPagamento = 'Pendente'
            validators.clearValidationError(formaPagamento)
            this.toggleDescricaoPendente('')
        }
    }

    cancelarVenda() {
        if (this.itensVenda.length > 0 || this.vendaEditando) {
            const mensagem = this.vendaEditando ? 
                'Cancelar edição da venda? As alterações não serão salvas.' : 
                'Cancelar esta venda? Os itens adicionados serão perdidos.'
            
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
        this.descricaoPendente = ''
        
        // Resetar forma de pagamento
        const formaPagamento = document.getElementById('formaPagamentoVenda')
        if (formaPagamento) {
            formaPagamento.value = ''
            this.formaPagamento = 'Pendente'
            validators.clearValidationError(formaPagamento)
            this.toggleDescricaoPendente('')
        }
        
        this.alternarBotoesVenda(false)
    }
    
    async criarNovaVenda() {
        console.log('Criando nova venda...')
        
        const primeiroItem = this.itensVenda[0]
        const formaPagamento = document.getElementById('formaPagamentoVenda')?.value || 'Pendente'
        const descricaoPendente = formaPagamento === 'Pendente' ? this.descricaoPendente : null
        
        const venda = {
            data_venda: new Date().toISOString(),
            numero_venda: this.numeroVenda,
            codigo_produto: primeiroItem.codigo_produto,
            descricao_produto: primeiroItem.descricao_produto,
            fornecedor: primeiroItem.fornecedor,
            categoria: primeiroItem.categoria,
            quantidade: this.itensVenda.reduce((sum, item) => sum + item.quantidade, 0),
            valor_unitario: primeiroItem.valor_unitario,
            desconto: this.itensVenda.reduce((sum, item) => sum + item.desconto, 0),
            valor_total: this.itensVenda.reduce((sum, item) => sum + item.valor_total, 0),
            forma_pagamento: formaPagamento,
            descricao_pendente: descricaoPendente  // Adicionar descrição
        }
        
        console.log('Data da venda a ser salva (UTC):', venda.data_venda)
        
        // Preparar itens com forma_pagamento
        const itensParaSalvar = this.itensVenda.map(item => ({
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
            forma_pagamento: formaPagamento
        }))
        
        const { data, error } = await supabaseService.saveVenda(venda, itensParaSalvar)
        
        if (error) {
            console.error('Erro ao salvar venda:', error)
            throw error
        }
        
        console.log('Venda salva com sucesso:', data)
        
        // Atualizar estoque dos produtos
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
        console.log('Atualizando venda existente...')
        
        // Buscar itens antigos da venda
        const { data: itensAntigos } = await supabaseService.getItensVenda(this.vendaEditando.id)
        
        if (!itensAntigos || itensAntigos.length === 0) {
            console.error('Nenhum item antigo encontrado')
            return
        }
        
        console.log('Itens antigos:', itensAntigos)
        console.log('Itens novos (editados):', this.itensVenda)
        
        // 1. DEVOLVER TODOS os itens antigos ao estoque
        for (const itemAntigo of itensAntigos) {
            const produto = this.produtos.find(p => p.id === itemAntigo.produto_id)
            if (produto) {
                const quantidadeDevolver = itemAntigo.quantidade
                const novaQuantidade = produto.quantidade + quantidadeDevolver
                
                console.log(`Devolvendo ao estoque: ${produto.descricao_produto} - Qtd antiga: ${quantidadeDevolver} - Estoque antes: ${produto.quantidade} - Estoque depois: ${novaQuantidade}`)
                
                await supabaseService.updateProduto(produto.id, {
                    ...produto,
                    quantidade: novaQuantidade
                })
                
                // Atualizar o produto local também
                produto.quantidade = novaQuantidade
            }
        }
        
        // 2. SUBTRAIR os novos itens do estoque
        for (const itemNovo of this.itensVenda) {
            const produto = this.produtos.find(p => p.id === itemNovo.produto_id)
            if (produto) {
                const quantidadeSubtrair = itemNovo.quantidade
                const novaQuantidade = produto.quantidade - quantidadeSubtrair
                
                if (novaQuantidade < 0) {
                    console.error(`Estoque insuficiente para: ${produto.descricao_produto}`)
                    this.showError(`Estoque insuficiente para: ${produto.descricao_produto}`)
                    return
                }
                
                console.log(`Subtraindo do estoque: ${produto.descricao_produto} - Qtd nova: ${quantidadeSubtrair} - Estoque antes: ${produto.quantidade} - Estoque depois: ${novaQuantidade}`)
                
                await supabaseService.updateProduto(produto.id, {
                    ...produto,
                    quantidade: novaQuantidade
                })
                
                // Atualizar o produto local também
                produto.quantidade = novaQuantidade
            }
        }
        
        // 3. Atualizar a venda (resumo)
        const primeiroItem = this.itensVenda[0]
        const formaPagamento = document.getElementById('formaPagamentoVenda')?.value || this.vendaEditando.forma_pagamento || 'Pendente'
        const descricaoPendente = formaPagamento === 'Pendente' ? this.descricaoPendente : null
        
        const vendaAtualizada = {
            data_venda: this.vendaEditando.data_venda,
            numero_venda: this.numeroVenda,
            codigo_produto: primeiroItem.codigo_produto,
            descricao_produto: primeiroItem.descricao_produto,
            fornecedor: primeiroItem.fornecedor,
            categoria: primeiroItem.categoria,
            quantidade: this.itensVenda.reduce((sum, item) => sum + item.quantidade, 0),
            valor_unitario: primeiroItem.valor_unitario,
            desconto: this.itensVenda.reduce((sum, item) => sum + (item.desconto || 0), 0),
            valor_total: this.itensVenda.reduce((sum, item) => sum + (item.valor_total || 0), 0),
            forma_pagamento: formaPagamento,
            descricao_pendente: descricaoPendente
        }
        
        console.log('Atualizando venda:', vendaAtualizada)
        
        await supabaseService.updateVenda(this.vendaEditando.id, vendaAtualizada)
        
        // 4. Excluir itens antigos
        await supabaseService.deleteItensVenda(this.vendaEditando.id)
        
        // 5. Inserir novos itens
        const itensParaInserir = this.itensVenda.map(item => ({
            venda_id: this.vendaEditando.id,
            produto_id: item.produto_id,
            codigo_produto: item.codigo_produto,
            descricao_produto: item.descricao_produto,
            fornecedor: item.fornecedor,
            categoria: item.categoria,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_compra: item.valor_compra || this.buscarValorCompraProduto(item.codigo_produto) || 0,
            desconto: item.desconto || 0,
            valor_total: item.valor_total,
            forma_pagamento: formaPagamento,
            descricao_pendente: descricaoPendente
        }))
        
        console.log('Inserindo novos itens:', itensParaInserir)
        
        const { error } = await supabaseService.saveItensVenda(itensParaInserir)
        if (error) throw error
        
        console.log('Venda atualizada com sucesso!')
    }
    
    async editarItemVenda(vendaId, itemId) {
        try {
            this.showLoading('Carregando itens da venda...')
            
            const { data: vendas, error } = await supabaseService.getVendas()
            
            if (error) {
                this.hideLoading()
                this.showError('Erro ao carregar venda: ' + error.message)
                return
            }
            
            const venda = vendas.find(v => v.id === vendaId)
            if (!venda) {
                this.hideLoading()
                this.showError('Venda não encontrada')
                return
            }
            
            const { data: itens, error: itensError } = await supabaseService.getItensVenda(vendaId)
            
            this.hideLoading()
            
            if (itensError) {
                this.showError('Erro ao carregar itens da venda')
                return
            }
            
            this.vendaEditando = venda
            this.numeroVenda = venda.numero_venda
            this.setNumeroVenda()
            
            // ALTERNAR BOTÕES para modo edição
            this.alternarBotoesVenda(true)
            
            // Definir forma de pagamento no select
            const formaPagamentoSelect = document.getElementById('formaPagamentoVenda')
            if (formaPagamentoSelect) {
                formaPagamentoSelect.value = venda.forma_pagamento || 'Pendente'
                this.formaPagamento = venda.forma_pagamento || 'Pendente'
                validators.clearValidationError(formaPagamentoSelect)
                
                // Mostrar/esconder campo de descrição e preencher
                this.toggleDescricaoPendente(venda.forma_pagamento)
                if (venda.forma_pagamento === 'Pendente' && venda.descricao_pendente) {
                    this.descricaoPendente = venda.descricao_pendente
                    document.getElementById('descricaoPendente').value = venda.descricao_pendente
                }
            }
            
            // Carregar itens
            this.itensVenda = (itens || []).map(item => {
                let valorCompra = item.valor_compra
                if (!valorCompra || valorCompra === 0) {
                    valorCompra = this.buscarValorCompraProduto(item.codigo_produto)
                }
                
                return {
                    id: item.id,
                    produto_id: item.produto_id,
                    codigo_produto: item.codigo_produto,
                    descricao_produto: item.descricao_produto,
                    fornecedor: item.fornecedor || this.getFornecedorProduto(item.produto_id),
                    categoria: item.categoria || this.getCategoriaProduto(item.produto_id),
                    quantidade: item.quantidade,
                    valor_unitario: item.valor_unitario,
                    valor_compra: valorCompra,
                    desconto: item.desconto || 0,
                    valor_total: item.valor_total
                }
            })
            
            this.renderizarItensVenda()
            this.atualizarTotais()
            
            this.showSuccess('Venda carregada para edição')
            
            document.querySelector('.card')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            })
            
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao editar item:', err)
            this.showError('Erro ao carregar itens da venda')
        }
    }

    // Métodos auxiliares para buscar fornecedor e categoria do produto
    getFornecedorProduto(produtoId) {
        const produto = this.produtos.find(p => p.id === produtoId)
        console.log('Buscando fornecedor para produto', produtoId, ':', produto?.fornecedor)
        return produto?.fornecedor || ''
    }

    getCategoriaProduto(produtoId) {
        const produto = this.produtos.find(p => p.id === produtoId)
        console.log('Buscando categoria para produto', produtoId, ':', produto?.categoria)
        return produto?.categoria || ''
    }
    
    async excluirItemVenda(vendaId, itemId) {
        const confirmado = await this.showConfirm({
            title: 'Excluir Item da Venda',
            message: 'Tem certeza que deseja excluir este item? A quantidade será devolvida ao estoque.',
            confirmText: 'Sim, excluir',
            cancelText: 'Cancelar',
            type: 'danger',
            icon: 'fa-trash-alt'
        })
        
        if (!confirmado) {
            return
        }
        
        try {
            this.showLoading('Excluindo item...')
            
            const { data: itens, error: itensError } = await supabaseService.getItensVenda(vendaId)
            
            if (itensError) {
                this.hideLoading()
                this.showError('Erro ao buscar itens: ' + itensError.message)
                return
            }
            
            const item = itens.find(i => i.id === itemId)
            
            if (item) {
                // Devolver ao estoque
                const produto = this.produtos.find(p => p.id === item.produto_id)
                if (produto) {
                    const novaQuantidade = produto.quantidade + item.quantidade
                    await supabaseService.updateProduto(produto.id, {
                        ...produto,
                        quantidade: novaQuantidade
                    })
                }
                
                // Excluir o item
                const { error: deleteError } = await supabaseService.deleteItemVenda(itemId)
                
                if (deleteError) {
                    this.hideLoading()
                    this.showError('Erro ao excluir item: ' + deleteError.message)
                    return
                }
            }
            
            // Verificar se ainda existem itens nesta venda
            const { data: itensRestantes } = await supabaseService.getItensVenda(vendaId)
            
            if (!itensRestantes || itensRestantes.length === 0) {
                await supabaseService.deleteVenda(vendaId)
            } else {
                const totalVenda = itensRestantes.reduce((sum, i) => sum + parseFloat(i.valor_total), 0)
                const quantidadeTotal = itensRestantes.reduce((sum, i) => sum + i.quantidade, 0)
                
                await supabaseService.updateVenda(vendaId, {
                    quantidade: quantidadeTotal,
                    valor_total: totalVenda
                })
            }
            
            this.hideLoading()
            this.showSuccess('Item excluído com sucesso!')
            
            await this.carregarProdutos()
            await this.carregarVendasDoDia()
            
            if (this.vendaEditando?.id === vendaId) {
                this.cancelarVenda()
            }
            
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao excluir item:', err)
            this.showError('Erro ao excluir item')
        }
    }
    
    async editarVenda(id) {
        try {
            const { data: itens } = await supabaseService.getItensVenda(id)
            if (itens && itens.length > 0) {
                await this.editarItemVenda(id, itens[0].id)
            } else {
                this.showError('Venda sem itens')
            }
        } catch (err) {
            console.error('Erro ao editar venda:', err)
            this.showError('Erro ao carregar venda')
        }
    }
    
    async excluirVenda(id) {
        const confirmado = await this.showConfirm({
            title: 'Excluir Venda',
            message: 'Tem certeza que deseja excluir esta venda? Todos os itens serão devolvidos ao estoque.',
            confirmText: 'Sim, excluir',
            cancelText: 'Cancelar',
            type: 'danger',
            icon: 'fa-trash-alt'
        })
        
        if (!confirmado) {
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
    
    async cancelarVenda() {
        if (this.itensVenda.length > 0 || this.vendaEditando) {
            const titulo = this.vendaEditando ? 'Cancelar Edição' : 'Cancelar Venda'
            const mensagem = this.vendaEditando ? 
                'Tem certeza que deseja cancelar a edição? Todas as alterações serão perdidas.' : 
                'Tem certeza que deseja cancelar esta venda? Todos os itens adicionados serão perdidos.'
            
            const confirmado = await this.showConfirm({
                title: titulo,
                message: mensagem,
                confirmText: 'Sim, cancelar',
                cancelText: 'Não, continuar',
                type: 'warning',
                icon: 'fa-exclamation-triangle'
            })
            
            if (!confirmado) {
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
        
        // Resetar forma de pagamento
        const formaPagamento = document.getElementById('formaPagamentoVenda')
        if (formaPagamento) {
            formaPagamento.value = ''
            this.formaPagamento = 'Pendente'
            validators.clearValidationError(formaPagamento)
        }
        
        this.alternarBotoesVenda(false)
    }

    // Método para o botão Cancelar (chamado pelo onclick)
    async cancelarVendaBtn() {
        this.cancelarVenda()
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