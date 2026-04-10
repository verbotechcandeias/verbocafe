// js/modules/produtos.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'
import * as validators from '../utils/validators.js'

class ProdutosModule {
    constructor() {
        this.produtos = []
        this.produtoSelecionado = null
        this.codigosCompra = []
    }

    showConfirm(options = {}) {
        const {
            title = 'Confirmar ação',
            message = 'Tem certeza que deseja continuar?',
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            type = 'warning',
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
    
    async init() {
        await this.carregarCodigosCompra()
        this.setupEventListeners()
        await this.carregarProdutos()
    }
    
    async carregarCodigosCompra() {
        const { data, error } = await supabaseService.getCodigosCompra()
        
        if (error) {
            console.error('Erro ao carregar códigos:', error)
            return
        }
        
        // Remove duplicatas baseado no código do produto
        this.codigosCompra = Array.from(
            new Map(data.map(item => [item.codigo_produto, item])).values()
        )
        
        this.preencherSelectCodigos()
    }
    
    preencherSelectCodigos() {
        const select = document.getElementById('codigoProdutoSelect')
        if (!select) return
        
        select.innerHTML = '<option value="">Selecione um código...</option>'
        
        this.codigosCompra.forEach(item => {
            const option = document.createElement('option')
            option.value = item.codigo_produto
            option.textContent = `${item.codigo_produto} - ${item.descricao_produto}`
            option.dataset.descricao = item.descricao_produto
            option.dataset.fornecedor = item.fornecedor
            option.dataset.categoria = item.categoria
            select.appendChild(option)
        })
    }
    
    setupEventListeners() {
        const selectCodigo = document.getElementById('codigoProdutoSelect')
        if (selectCodigo) {
            selectCodigo.addEventListener('change', (e) => {
                this.onCodigoSelecionado(e.target)
            })
        }
        
        // Configurar campo de quantidade
        const quantidade = document.getElementById('quantidadeProd')
        if (quantidade) {
            quantidade.addEventListener('input', (e) => {
                validators.validateNumber(e.target, 0)
            })
            
            quantidade.addEventListener('blur', (e) => {
                const value = parseInt(e.target.value) || 0
                if (value < 0) {
                    e.target.value = 0
                }
            })
        }
        
        // Configurar campo de valor de venda
        const valorVenda = document.getElementById('valorVenda')
        if (valorVenda) {
            // Formatação durante digitação
            valorVenda.addEventListener('input', (e) => {
                this.formatarMoeda(e.target)
            })
            
            // Validação ao perder o foco
            valorVenda.addEventListener('blur', (e) => {
                this.validarValorVenda(e.target)
            })
            
            // Limpar erro ao focar
            valorVenda.addEventListener('focus', (e) => {
                validators.clearValidationError(e.target)
                // Se for 0,00, limpa o campo
                const value = this.obterValorNumerico(e.target)
                if (value === 0) {
                    e.target.value = ''
                }
            })
        }
        
        // Prevenir submissão do formulário
        const form = document.getElementById('formProdutos')
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault()
            })
        }
    }
    
    formatarMoeda(input) {
        if (!input) return
        
        let value = input.value
        
        // Remove tudo exceto números
        value = value.replace(/\D/g, '')
        
        if (value === '') {
            input.value = ''
            return
        }
        
        // Converte para número e divide por 100 para ter os centavos
        const number = parseInt(value) / 100
        
        // Formata como moeda brasileira
        input.value = number.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
    }
    
    validarValorVenda(input) {
        if (!input) return false
        
        // Se estiver vazio, define como 0,00
        if (!input.value || input.value.trim() === '') {
            input.value = '0,00'
            return false
        }
        
        // Obtém valor numérico
        const valorNumerico = this.obterValorNumerico(input)
        
        // Valida se é maior que zero
        if (valorNumerico <= 0) {
            validators.showValidationError(input, 'O valor de venda deve ser maior que zero')
            input.value = '0,00'
            return false
        }
        
        // Formata novamente para garantir
        input.value = valorNumerico.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
        
        validators.clearValidationError(input)
        return true
    }
    
    obterValorNumerico(input) {
        if (!input || !input.value) return 0
        
        // Remove pontos (separadores de milhar) e substitui vírgula por ponto
        const valorLimpo = input.value
            .replace(/\./g, '')
            .replace(',', '.')
            .trim()
        
        const numero = parseFloat(valorLimpo)
        return isNaN(numero) ? 0 : numero
    }
    
    onCodigoSelecionado(select) {
        const selectedOption = select.options[select.selectedIndex]
        
        if (select.value) {
            document.getElementById('descricaoProdutoProd').value = selectedOption.dataset.descricao || ''
            document.getElementById('fornecedorProd').value = selectedOption.dataset.fornecedor || ''
            document.getElementById('categoriaProd').value = selectedOption.dataset.categoria || ''
        } else {
            document.getElementById('descricaoProdutoProd').value = ''
            document.getElementById('fornecedorProd').value = ''
            document.getElementById('categoriaProd').value = ''
        }
    }
    
    async carregarProdutos() {
        try {
            const { data, error } = await supabaseService.getProdutos()
            
            if (error) {
                this.showError('Erro ao carregar produtos: ' + error.message)
                return
            }
            
            this.produtos = data || []
            this.renderizarTabela()
        } catch (err) {
            console.error('Erro ao carregar produtos:', err)
            this.showError('Erro ao carregar produtos')
        }
    }
    
    renderizarTabela() {
        const tbody = document.getElementById('tbodyProdutos')
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        if (this.produtos.length === 0) {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 20px;">
                    Nenhum produto cadastrado
                </td>
            `
            tbody.appendChild(tr)
            return
        }
        
        this.produtos.forEach(produto => {
            const tr = document.createElement('tr')
            const statusClass = produto.quantidade === 0 ? 'estoque-zerado' : 
                               produto.quantidade < 10 ? 'estoque-baixo' : ''
            
            tr.className = statusClass
            tr.innerHTML = `
                <td>${produto.codigo_produto || '-'}</td>
                <td>${produto.descricao_produto || '-'}</td>
                <td>${produto.fornecedor || '-'}</td>
                <td>${produto.categoria || '-'}</td>
                <td>
                    <span class="badge ${produto.quantidade === 0 ? 'badge-danger' : 
                           produto.quantidade < 10 ? 'badge-warning' : 'badge-success'}">
                        ${produto.quantidade || 0}
                    </span>
                </td>
                <td>${formatters.formatCurrency(produto.valor_venda || 0)}</td>
                <td>
                    <button class="btn-icon" onclick="produtosModule.selecionarProduto('${produto.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="produtosModule.excluirProduto('${produto.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `
            tbody.appendChild(tr)
        })
        
        this.adicionarEstilos()
    }
    
    adicionarEstilos() {
        if (document.querySelector('#produto-styles')) return
        
        const style = document.createElement('style')
        style.id = 'produto-styles'
        style.textContent = `
            .estoque-baixo {
                background-color: #fff3cd !important;
            }
            .estoque-zerado {
                background-color: #f8d7da !important;
            }
            .badge {
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                display: inline-block;
            }
            .badge-success {
                background: #d4edda;
                color: #155724;
            }
            .badge-warning {
                background: #fff3cd;
                color: #856404;
            }
            .badge-danger {
                background: #f8d7da;
                color: #721c24;
            }
            .btn-icon {
                background: none;
                border: none;
                cursor: pointer;
                padding: 5px 8px;
                margin: 0 3px;
                border-radius: 4px;
                transition: all 0.3s;
            }
            .btn-icon:hover {
                background: #f0f0f0;
            }
            .btn-icon .fa-edit {
                color: #007bff;
            }
            .btn-icon .fa-trash {
                color: #dc3545;
            }
            .table-responsive {
                overflow-x: auto;
            }
            .modern-table td {
                vertical-align: middle;
            }
        `
        document.head.appendChild(style)
    }
    
    async cadastrar() {
        try {
            const produto = this.getFormData()
            
            if (!this.validarForm(produto)) {
                return
            }
            
            // Verifica se o produto já existe
            const produtoExistente = this.produtos.find(p => p.codigo_produto === produto.codigo_produto)
            if (produtoExistente) {
                this.showError('Já existe um produto cadastrado com este código')
                return
            }
            
            this.showLoading('Cadastrando produto...')
            
            const { data, error } = await supabaseService.saveProduto(produto)
            
            this.hideLoading()
            
            if (error) {
                this.showError('Erro ao cadastrar produto: ' + error.message)
                return
            }
            
            this.showSuccess('Produto cadastrado com sucesso!')
            this.limparForm()
            await this.carregarProdutos()
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao cadastrar:', err)
            this.showError('Erro ao cadastrar produto')
        }
    }
    
    async alterar() {
        try {
            if (!this.produtoSelecionado) {
                this.showError('Selecione um produto para alterar')
                return
            }
            
            const produto = this.getFormData()
            
            if (!this.validarForm(produto)) {
                return
            }
            
            this.showLoading('Alterando produto...')
            
            const { data, error } = await supabaseService.updateProduto(
                this.produtoSelecionado.id, 
                produto
            )
            
            this.hideLoading()
            
            if (error) {
                this.showError('Erro ao alterar produto: ' + error.message)
                return
            }
            
            this.showSuccess('Produto alterado com sucesso!')
            this.limparForm()
            this.produtoSelecionado = null
            await this.carregarProdutos()
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao alterar:', err)
            this.showError('Erro ao alterar produto')
        }
    }
    
    async excluir() {
        if (!this.produtoSelecionado) {
            this.showError('Selecione um produto para excluir')
            return
        }
        
        const confirmado = await this.showConfirm({
            title: 'Excluir Produto',
            message: 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.',
            confirmText: 'Sim, excluir',
            cancelText: 'Cancelar',
            type: 'danger',
            icon: 'fa-trash-alt'
        })
        
        if (!confirmado) {
            return
        }
        
        try {
            this.showLoading('Excluindo produto...')
            
            const { error } = await supabaseService.deleteProduto(this.produtoSelecionado.id)
            
            this.hideLoading()
            
            if (error) {
                this.showError('Erro ao excluir produto: ' + error.message)
                return
            }
            
            this.showSuccess('Produto excluído com sucesso!')
            this.limparForm()
            this.produtoSelecionado = null
            await this.carregarProdutos()
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao excluir:', err)
            this.showError('Erro ao excluir produto')
        }
    }
    
    selecionarProduto(id) {
        this.produtoSelecionado = this.produtos.find(p => p.id === id)
        
        if (this.produtoSelecionado) {
            document.getElementById('codigoProdutoSelect').value = this.produtoSelecionado.codigo_produto
            
            // Dispara o evento change manualmente para preencher os campos
            const select = document.getElementById('codigoProdutoSelect')
            const event = new Event('change', { bubbles: true })
            select.dispatchEvent(event)
            
            document.getElementById('quantidadeProd').value = this.produtoSelecionado.quantidade || 0
            
            // Formatar valor de venda
            const valorVenda = this.produtoSelecionado.valor_venda || 0
            const valorVendaInput = document.getElementById('valorVenda')
            valorVendaInput.value = valorVenda.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
            
            // Scroll para o formulário
            document.querySelector('.card')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            })
        }
    }
    
    async excluirProduto(id) {
        const confirmado = await this.showConfirm({
            title: 'Excluir Produto',
            message: 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.',
            confirmText: 'Sim, excluir',
            cancelText: 'Cancelar',
            type: 'danger',
            icon: 'fa-trash-alt'
        })
        
        if (!confirmado) {
            return
        }
        
        try {
            this.showLoading('Excluindo produto...')
            
            const { error } = await supabaseService.deleteProduto(id)
            
            this.hideLoading()
            
            if (error) {
                this.showError('Erro ao excluir produto: ' + error.message)
                return
            }
            
            this.showSuccess('Produto excluído com sucesso!')
            if (this.produtoSelecionado?.id === id) {
                this.limparForm()
                this.produtoSelecionado = null
            }
            await this.carregarProdutos()
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao excluir:', err)
            this.showError('Erro ao excluir produto')
        }
    }
    
    limparForm() {
        document.getElementById('codigoProdutoSelect').value = ''
        document.getElementById('descricaoProdutoProd').value = ''
        document.getElementById('fornecedorProd').value = ''
        document.getElementById('categoriaProd').value = ''
        document.getElementById('quantidadeProd').value = ''
        document.getElementById('valorVenda').value = ''
        this.produtoSelecionado = null
        
        // Limpar validações
        const inputs = document.querySelectorAll('#formProdutos input, #formProdutos select')
        inputs.forEach(input => validators.clearValidationError(input))
    }
    
    getFormData() {
        // Obter valor numérico do campo formatado
        const valorVendaInput = document.getElementById('valorVenda')
        const valorVenda = this.obterValorNumerico(valorVendaInput)
        
        return {
            codigo_produto: document.getElementById('codigoProdutoSelect').value,
            descricao_produto: document.getElementById('descricaoProdutoProd').value,
            fornecedor: document.getElementById('fornecedorProd').value,
            categoria: document.getElementById('categoriaProd').value,
            quantidade: parseInt(document.getElementById('quantidadeProd').value) || 0,
            valor_venda: valorVenda
        }
    }
    
    validarForm(produto) {
        // Validar código do produto
        if (!produto.codigo_produto) {
            const campo = document.getElementById('codigoProdutoSelect')
            validators.showValidationError(campo, 'Selecione um código de produto')
            campo.focus()
            return false
        }
        
        // Validar descrição
        if (!produto.descricao_produto || produto.descricao_produto.trim() === '') {
            const campo = document.getElementById('descricaoProdutoProd')
            validators.showValidationError(campo, 'Descrição do produto é obrigatória')
            campo.focus()
            return false
        }
        
        // Validar quantidade
        if (produto.quantidade < 0) {
            const campo = document.getElementById('quantidadeProd')
            validators.showValidationError(campo, 'Quantidade não pode ser negativa')
            campo.focus()
            return false
        }
        
        // Validar valor de venda
        if (produto.valor_venda <= 0) {
            const campo = document.getElementById('valorVenda')
            validators.showValidationError(campo, 'Valor de venda deve ser maior que zero')
            campo.focus()
            return false
        }
        
        return true
    }
    
    showError(message) {
        this.showNotification(message, 'error')
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success')
    }
    
    showLoading(message = 'Processando...') {
        // Remover loading existente
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
        
        // Adicionar animação se não existir
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
    
    showNotification(message, type) {
        // Remover notificações existentes
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
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease'
            setTimeout(() => notification.remove(), 300)
        }, 3000)
        
        // Adicionar animações se não existirem
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

export const produtosModule = new ProdutosModule()