// js/modules/compras.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'
import * as validators from '../utils/validators.js'
import * as dateTime from '../utils/datetime.js'

class ComprasModule {
    constructor() {
        this.compras = []
        this.compraSelecionada = null
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
        this.setupEventListeners()
        this.setDataCompra()
        await this.carregarCompras()
    }

    calcularValorTotal() {
        const quantidade = parseInt(document.getElementById('quantidade').value) || 0
        const valorUnitario = this.obterValorNumerico(document.getElementById('valorCompra'))
        
        // Permite valor zero
        const valorTotal = quantidade * valorUnitario
        
        const valorTotalInput = document.getElementById('valorTotalCompra')
        if (valorTotalInput) {
            valorTotalInput.value = valorTotal.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
        }
    }
    
    setupEventListeners() {
        // Formatar campo de valor de compra
        const valorCompra = document.getElementById('valorCompra')
        if (valorCompra) {
            valorCompra.addEventListener('input', (e) => {
                this.formatarMoeda(e.target)
                this.calcularValorTotal()
            })
            
            valorCompra.addEventListener('blur', (e) => {
                this.validarValorCompra(e.target)
                this.calcularValorTotal()
            })
            
            valorCompra.addEventListener('focus', (e) => {
                validators.clearValidationError(e.target)
                const value = this.obterValorNumerico(e.target)
                if (value === 0) {
                    e.target.value = ''
                }
            })
        }
        
        // Validar quantidade e calcular total
        const quantidade = document.getElementById('quantidade')
        if (quantidade) {
            quantidade.addEventListener('input', (e) => {
                validators.validateNumber(e.target, 1)
                this.calcularValorTotal()
            })
            
            quantidade.addEventListener('blur', (e) => {
                const value = parseInt(e.target.value) || 0
                if (value < 1) {
                    e.target.value = 1
                }
                this.calcularValorTotal()
            })
        }
        
        // Prevenir submissão do formulário
        const form = document.getElementById('formCompras')
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
        
        // Formata como moeda brasileira (permite zero)
        input.value = number.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
        
        this.calcularValorTotal()
    }
    
    validarValorCompra(input) {
        if (!input) return false
        
        // Se estiver vazio, define como 0,00
        if (!input.value || input.value.trim() === '') {
            input.value = '0,00'
            this.calcularValorTotal()
            return true
        }
        
        const valorNumerico = this.obterValorNumerico(input)
        
        // Permite valor zero ou maior
        if (valorNumerico < 0) {
            validators.showValidationError(input, 'O valor de compra não pode ser negativo')
            input.value = '0,00'
            this.calcularValorTotal()
            return false
        }
        
        // Formata novamente para garantir
        input.value = valorNumerico.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })
        
        validators.clearValidationError(input)
        this.calcularValorTotal()
        return true
    }
    
    obterValorNumerico(input) {
        if (!input) return 0
        if (typeof input === 'number') return input
        
        // Se o valor for vazio, retorna 0
        if (!input.value || input.value.trim() === '') {
            return 0
        }
        
        // Remover formatação e converter para número
        const valorLimpo = input.value
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, '')  // Remove qualquer caractere não numérico exceto ponto e menos
            .trim()
        
        const numero = parseFloat(valorLimpo)
        
        // Retornar 0 se for NaN, negativo ou inválido
        if (isNaN(numero)) return 0
        if (numero < 0) return 0
        
        return numero
    }
    
   setDataCompra() {
        const dataInput = document.getElementById('dataCompra')
        if (dataInput) {
            dataInput.value = dateTime.getHojeISO()
        }
    }
    
    async carregarCompras() {
        try {
            const { data, error } = await supabaseService.getCompras()
            
            if (error) {
                this.showError('Erro ao carregar compras: ' + error.message)
                return
            }
            
            this.compras = data || []
            this.renderizarTabela()
        } catch (err) {
            console.error('Erro ao carregar compras:', err)
            this.showError('Erro ao carregar compras')
        }
    }
    
    renderizarTabela() {
        const tbody = document.getElementById('tbodyCompras')
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        if (this.compras.length === 0) {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td colspan="9" style="text-align: center; padding: 20px;">
                    Nenhuma compra cadastrada
                </td>
            `
            tbody.appendChild(tr)
            return
        }
        
        // Ordenar por data (mais recente primeiro)
        const comprasOrdenadas = [...this.compras].sort((a, b) => 
            new Date(b.data_compra) - new Date(a.data_compra)
        )
        
        comprasOrdenadas.forEach(compra => {
            const tr = document.createElement('tr')
            
            // Formatar data para exibição
            let dataExibicao = compra.data_compra
            if (typeof dataExibicao === 'string') {
                if (dataExibicao.includes('-') && !dataExibicao.includes('T')) {
                    const [ano, mes, dia] = dataExibicao.split('-')
                    dataExibicao = `${dia}/${mes}/${ano}`
                } else {
                    dataExibicao = formatters.formatDate(dataExibicao)
                }
            } else {
                dataExibicao = formatters.formatDate(dataExibicao)
            }
            
            // Calcular valor total se não existir
            const valorTotal = compra.valor_total || (compra.quantidade * compra.valor_compra)
            
            tr.innerHTML = `
                <td>${dataExibicao}</td>
                <td>${compra.codigo_produto || '-'}</td>
                <td>${compra.descricao_produto || '-'}</td>
                <td>${compra.fornecedor || '-'}</td>
                <td>${compra.categoria || '-'}</td>
                <td>${compra.quantidade || 0}</td>
                <td>${formatters.formatCurrency(compra.valor_compra)}</td>
                <td>${formatters.formatCurrency(valorTotal)}</td>
                <td>
                    <button class="btn-icon" onclick="comprasModule.selecionarCompra('${compra.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="comprasModule.excluirCompra('${compra.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `
            tbody.appendChild(tr)
        })
        
        this.adicionarEstilos()
    }
    
    adicionarEstilos() {
        if (document.querySelector('#compras-styles')) return
        
        const style = document.createElement('style')
        style.id = 'compras-styles'
        style.textContent = `
            .btn-icon {
                background: none;
                border: none;
                cursor: pointer;
                padding: 5px 8px;
                margin: 0 3px;
                border-radius: 4px;
                transition: all 0.3s;
                min-height: 44px;
                min-width: 44px;
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
        `
        document.head.appendChild(style)
    }
    
    async cadastrar() {
        try {
            const compra = this.getFormData()
            
            console.log('Dados da compra a cadastrar:', compra)
            
            if (!this.validarForm(compra)) {
                return
            }
            
            this.showLoading('Cadastrando compra...')
            
            const { data, error } = await supabaseService.saveCompra(compra)
            
            this.hideLoading()
            
            if (error) {
                console.error('Erro detalhado:', error)
                this.showError('Erro ao cadastrar compra: ' + error.message)
                return
            }
            
            this.showSuccess('Compra cadastrada com sucesso!')
            this.limparForm()
            await this.carregarCompras()
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao cadastrar:', err)
            this.showError('Erro ao cadastrar compra')
        }
    }
    
    async alterar() {
        try {
            if (!this.compraSelecionada) {
                this.showError('Selecione uma compra para alterar')
                return
            }
            
            const compra = this.getFormData()
            
            console.log('Dados da compra a alterar:', compra)
            
            if (!this.validarForm(compra)) {
                return
            }
            
            this.showLoading('Alterando compra...')
            
            const { data, error } = await supabaseService.updateCompra(
                this.compraSelecionada.id, 
                compra
            )
            
            this.hideLoading()
            
            if (error) {
                console.error('Erro detalhado:', error)
                this.showError('Erro ao alterar compra: ' + error.message)
                return
            }
            
            this.showSuccess('Compra alterada com sucesso!')
            this.limparForm()
            this.compraSelecionada = null
            await this.carregarCompras()
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao alterar:', err)
            this.showError('Erro ao alterar compra')
        }
    }
    
    async excluir() {
        if (!this.compraSelecionada) {
            this.showError('Selecione uma compra para excluir')
            return
        }
        
        const confirmado = await this.showConfirm({
            title: 'Excluir Compra',
            message: 'Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.',
            confirmText: 'Sim, excluir',
            cancelText: 'Cancelar',
            type: 'danger',
            icon: 'fa-trash-alt'
        })
        
        if (!confirmado) {
            return
        }
        
        try {
            this.showLoading('Excluindo compra...')
            
            const { error } = await supabaseService.deleteCompra(this.compraSelecionada.id)
            
            this.hideLoading()
            
            if (error) {
                this.showError('Erro ao excluir compra: ' + error.message)
                return
            }
            
            this.showSuccess('Compra excluída com sucesso!')
            this.limparForm()
            this.compraSelecionada = null
            await this.carregarCompras()
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao excluir:', err)
            this.showError('Erro ao excluir compra')
        }
    }
    
    selecionarCompra(id) {
        this.compraSelecionada = this.compras.find(c => c.id === id)
        
        if (this.compraSelecionada) {
            // Formatar data para o input date (YYYY-MM-DD)
            const dataCompra = this.compraSelecionada.data_compra
            let dataFormatada = dataCompra
            
            if (typeof dataCompra === 'string' && dataCompra.includes('T')) {
                dataFormatada = dataCompra.split('T')[0]
            }
            
            document.getElementById('dataCompra').value = dataFormatada
            document.getElementById('codigoProduto').value = this.compraSelecionada.codigo_produto || ''
            document.getElementById('descricaoProduto').value = this.compraSelecionada.descricao_produto || ''
            document.getElementById('fornecedor').value = this.compraSelecionada.fornecedor || ''
            document.getElementById('categoria').value = this.compraSelecionada.categoria || ''
            document.getElementById('quantidade').value = this.compraSelecionada.quantidade || 1
            
            // Formatar valor unitário
            const valorUnitario = this.compraSelecionada.valor_compra || 0
            document.getElementById('valorCompra').value = valorUnitario.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
            
            // Formatar valor total
            const valorTotal = this.compraSelecionada.valor_total || (this.compraSelecionada.quantidade * valorUnitario)
            document.getElementById('valorTotalCompra').value = valorTotal.toLocaleString('pt-BR', {
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
    
    async excluirCompra(id) {
        const confirmado = await this.showConfirm({
            title: 'Excluir Compra',
            message: 'Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.',
            confirmText: 'Sim, excluir',
            cancelText: 'Cancelar',
            type: 'danger',
            icon: 'fa-trash-alt'
        })
        
        if (!confirmado) {
            return
        }
        
        try {
            this.showLoading('Excluindo compra...')
            
            const { error } = await supabaseService.deleteCompra(id)
            
            this.hideLoading()
            
            if (error) {
                this.showError('Erro ao excluir compra: ' + error.message)
                return
            }
            
            this.showSuccess('Compra excluída com sucesso!')
            if (this.compraSelecionada?.id === id) {
                this.limparForm()
                this.compraSelecionada = null
            }
            await this.carregarCompras()
        } catch (err) {
            this.hideLoading()
            console.error('Erro ao excluir:', err)
            this.showError('Erro ao excluir compra')
        }
    }
    
    limparForm() {
        this.setDataCompra()
        document.getElementById('codigoProduto').value = ''
        document.getElementById('descricaoProduto').value = ''
        document.getElementById('fornecedor').value = ''
        document.getElementById('categoria').value = ''
        document.getElementById('quantidade').value = ''
        document.getElementById('valorCompra').value = ''
        document.getElementById('valorTotalCompra').value = ''  // Limpar valor total
        this.compraSelecionada = null
        
        // Limpar validações
        const inputs = document.querySelectorAll('#formCompras input, #formCompras select')
        inputs.forEach(input => validators.clearValidationError(input))
    }
    
    getFormData() {
        // Obter valor numérico do campo formatado
        const valorCompraInput = document.getElementById('valorCompra')
        let valorCompra = 0
        
        if (valorCompraInput && valorCompraInput.value) {
            // Remover formatação e converter para número
            const valorLimpo = valorCompraInput.value
                .replace(/\./g, '')
                .replace(',', '.')
                .trim()
            valorCompra = parseFloat(valorLimpo) || 0
        }
        
        const quantidade = parseInt(document.getElementById('quantidade').value) || 0
        const valorTotal = quantidade * valorCompra
        
        // CORREÇÃO: Obter a data corretamente
        const dataCompraInput = document.getElementById('dataCompra')
        let dataCompra = dataCompraInput.value
        
        // Garantir que os valores numéricos sejam números válidos
        return {
            data_compra: dataCompra,
            codigo_produto: document.getElementById('codigoProduto').value.trim(),
            descricao_produto: document.getElementById('descricaoProduto').value.trim(),
            fornecedor: document.getElementById('fornecedor').value.trim(),
            categoria: document.getElementById('categoria').value,
            quantidade: quantidade,
            valor_compra: valorCompra,  // Garantir que é número
            valor_total: valorTotal     // Garantir que é número
        }
    }
    
    validarForm(compra) {
        // Validar data
        if (!compra.data_compra) {
            const campo = document.getElementById('dataCompra')
            validators.showValidationError(campo, 'Data da compra é obrigatória')
            campo.focus()
            return false
        }
        
        // Validar código
        if (!compra.codigo_produto) {
            const campo = document.getElementById('codigoProduto')
            validators.showValidationError(campo, 'Código do produto é obrigatório')
            campo.focus()
            return false
        }
        
        // Validar descrição
        if (!compra.descricao_produto) {
            const campo = document.getElementById('descricaoProduto')
            validators.showValidationError(campo, 'Descrição do produto é obrigatória')
            campo.focus()
            return false
        }
        
        // Validar fornecedor
        if (!compra.fornecedor) {
            const campo = document.getElementById('fornecedor')
            validators.showValidationError(campo, 'Fornecedor é obrigatório')
            campo.focus()
            return false
        }
        
        // Validar categoria
        if (!compra.categoria) {
            const campo = document.getElementById('categoria')
            validators.showValidationError(campo, 'Selecione uma categoria')
            campo.focus()
            return false
        }
        
        // Validar quantidade (deve ser maior que zero)
        if (compra.quantidade <= 0) {
            const campo = document.getElementById('quantidade')
            validators.showValidationError(campo, 'Quantidade deve ser maior que zero')
            campo.focus()
            return false
        }
        
        // Validar valor de compra (permite zero ou maior)
        if (compra.valor_compra < 0) {
            const campo = document.getElementById('valorCompra')
            validators.showValidationError(campo, 'Valor de compra não pode ser negativo')
            campo.focus()
            return false
        }
        
        return true
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

export const comprasModule = new ComprasModule()