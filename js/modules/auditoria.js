// js/modules/auditoria.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'
import * as validators from '../utils/validators.js'
import * as dateTime from '../utils/datetime.js'

class AuditoriaModule {
    constructor() {
        this.produtos = []
        this.itensAuditoria = []
        this.auditoriaAtual = null
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
            const overlay = document.createElement('div')
            overlay.className = 'modal-confirm-overlay'
            
            const modal = document.createElement('div')
            modal.className = 'modal-confirm'
            
            let iconClass = 'warning'
            if (type === 'danger') iconClass = 'danger'
            else if (type === 'info') iconClass = 'info'
            
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
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(false)
                }
            })
            
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false)
                    document.removeEventListener('keydown', handleEsc)
                }
            }
            document.addEventListener('keydown', handleEsc)
            
            setTimeout(() => cancelBtn.focus(), 100)
        })
    }
    
    async init() {
        await this.carregarProdutos()
        this.setupEventListeners()
        this.setDataAuditoria()
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
        const select = document.getElementById('descricaoAuditoria')
        if (!select) return
        
        select.innerHTML = '<option value="">Selecione um produto...</option>'
        
        this.produtos.forEach(produto => {
            const option = document.createElement('option')
            option.value = produto.id
            option.textContent = `${produto.descricao_produto} (Sistema: ${produto.quantidade})`
            option.dataset.codigo = produto.codigo_produto
            option.dataset.categoria = produto.categoria
            option.dataset.quantidadeSistema = produto.quantidade
            select.appendChild(option)
        })
    }
    
    setupEventListeners() {
        const selectProduto = document.getElementById('descricaoAuditoria')
        if (selectProduto) {
            selectProduto.addEventListener('change', (e) => {
                this.onProdutoSelecionado(e.target)
            })
        }
    }
    
    onProdutoSelecionado(select) {
        const selectedOption = select.options[select.selectedIndex]
        
        if (select.value) {
            document.getElementById('codigoAuditoria').value = selectedOption.dataset.codigo || ''
            document.getElementById('categoriaAuditoria').value = selectedOption.dataset.categoria || ''
        } else {
            document.getElementById('codigoAuditoria').value = ''
            document.getElementById('categoriaAuditoria').value = ''
        }
    }
    
    setDataAuditoria() {
        const dataInput = document.getElementById('dataAuditoria')
        if (dataInput) {
            dataInput.value = dateTime.formatDateTime(new Date())
        }
    }
    
    adicionarProduto() {
        const select = document.getElementById('descricaoAuditoria')
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
        
        const quantidadeFisica = parseInt(document.getElementById('quantidadeAuditoria').value) || 0
        
        if (quantidadeFisica < 0) {
            this.showError('Quantidade não pode ser negativa')
            return
        }
        
        // Verificar se o produto já está na lista
        const itemExistente = this.itensAuditoria.find(item => item.produto_id === produtoId)
        if (itemExistente) {
            this.showError('Este produto já foi adicionado à auditoria')
            return
        }
        
        const status = quantidadeFisica === produto.quantidade ? 'OK' : 'NÃO OK'
        
        const itemAuditoria = {
            produto_id: produto.id,
            codigo_produto: produto.codigo_produto,
            descricao_produto: produto.descricao_produto,
            categoria: produto.categoria,
            quantidade_fisica: quantidadeFisica,
            quantidade_sistema: produto.quantidade,
            status: status,
            diferenca: quantidadeFisica - produto.quantidade
        }
        
        this.itensAuditoria.push(itemAuditoria)
        this.renderizarItensAuditoria()
        this.limparFormProduto()
    }
    
    renderizarItensAuditoria() {
        const tbody = document.getElementById('tbodyItensAuditoria')
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        this.itensAuditoria.forEach((item, index) => {
            const tr = document.createElement('tr')
            const statusClass = item.status === 'OK' ? 'status-ok' : 'status-nao-ok'
            
            tr.innerHTML = `
                <td>${item.codigo_produto}</td>
                <td>${item.descricao_produto}</td>
                <td>${item.categoria}</td>
                <td>${item.quantidade_fisica}</td>
                <td>${item.quantidade_sistema}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${item.status}
                        ${item.diferenca !== 0 ? ` (${item.diferenca > 0 ? '+' : ''}${item.diferenca})` : ''}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="auditoriaModule.removerItem(${index})" title="Remover">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `
            tbody.appendChild(tr)
        })
        
        this.adicionarEstilos()
    }
    
    adicionarEstilos() {
        if (document.querySelector('#auditoria-styles')) return
        
        const style = document.createElement('style')
        style.id = 'auditoria-styles'
        style.textContent = `
            .status-badge {
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            .status-ok {
                background: #d4edda;
                color: #155724;
            }
            .status-nao-ok {
                background: #f8d7da;
                color: #721c24;
            }
        `
        document.head.appendChild(style)
    }
    
    async removerItem(index) {
        const item = this.itensAuditoria[index]
        if (!item) return
        
        const confirmado = await this.showConfirm({
            title: 'Remover Item',
            message: `Deseja remover "${item.descricao_produto}" da auditoria?`,
            confirmText: 'Remover',
            cancelText: 'Cancelar',
            type: 'warning',
            icon: 'fa-trash-alt'
        })
        
        if (confirmado) {
            this.itensAuditoria.splice(index, 1)
            this.renderizarItensAuditoria()
            this.showSuccess('Item removido da auditoria')
        }
    }
    
    limparFormProduto() {
        document.getElementById('descricaoAuditoria').value = ''
        document.getElementById('codigoAuditoria').value = ''
        document.getElementById('categoriaAuditoria').value = ''
        document.getElementById('quantidadeAuditoria').value = ''
    }
    
    async realizarAuditoria() {
        if (this.itensAuditoria.length === 0) {
            this.showError('Adicione pelo menos um produto para auditar')
            return
        }
        
        const dataAuditoria = dateTime.getAgoraISO()
        
        // Preparar dados para salvar
        const auditoriasParaSalvar = this.itensAuditoria.map(item => ({
            data_auditoria: dataAuditoria,
            codigo_produto: item.codigo_produto,
            descricao_produto: item.descricao_produto,
            categoria: item.categoria,
            quantidade_fisica: item.quantidade_fisica,
            quantidade_sistema: item.quantidade_sistema,
            status: item.status
        }))
        
        const { data, error } = await supabaseService.saveAuditoria(auditoriasParaSalvar)
        
        if (error) {
            this.showError('Erro ao salvar auditoria: ' + error.message)
            return
        }
        
        this.showSuccess('Auditoria realizada com sucesso!')
        this.auditoriaAtual = {
            data: dataAuditoria,
            itens: this.itensAuditoria
        }
    }
    
    async exportarPDF() {
        if (!this.auditoriaAtual) {
            this.showError('Nenhuma auditoria realizada para exportar')
            return
        }
        
        // Criar conteúdo para PDF
        const content = this.gerarConteudoPDF()
        
        // Usar window.print() como alternativa simples para PDF
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Relatório de Auditoria - Verbo Café</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                        }
                        h1 {
                            color: #8B4513;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #8B4513;
                            color: white;
                        }
                        .status-ok {
                            color: green;
                            font-weight: bold;
                        }
                        .status-nao-ok {
                            color: red;
                            font-weight: bold;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 20px;
                        }
                        .total {
                            margin-top: 20px;
                            font-weight: bold;
                        }
                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    </script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }
    
    gerarConteudoPDF() {
        const data = formatters.formatDateTime(new Date(this.auditoriaAtual.data))
        const itens = this.auditoriaAtual.itens
        
        let html = `
            <div class="header">
                <h1>Verbo Café - Relatório de Auditoria</h1>
                <p><strong>Data:</strong> ${data}</p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Qtd Física</th>
                        <th>Qtd Sistema</th>
                        <th>Diferença</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `
        
        let totalOK = 0
        let totalNaoOK = 0
        
        itens.forEach(item => {
            const statusClass = item.status === 'OK' ? 'status-ok' : 'status-nao-ok'
            const diferenca = item.quantidade_fisica - item.quantidade_sistema
            
            if (item.status === 'OK') {
                totalOK++
            } else {
                totalNaoOK++
            }
            
            html += `
                <tr>
                    <td>${item.codigo_produto}</td>
                    <td>${item.descricao_produto}</td>
                    <td>${item.categoria}</td>
                    <td>${item.quantidade_fisica}</td>
                    <td>${item.quantidade_sistema}</td>
                    <td>${diferenca > 0 ? '+' : ''}${diferenca}</td>
                    <td class="${statusClass}">${item.status}</td>
                </tr>
            `
        })
        
        html += `
                </tbody>
            </table>
            
            <div class="total">
                <p>Total de itens auditados: ${itens.length}</p>
                <p>Itens OK: ${totalOK}</p>
                <p>Itens com divergência: ${totalNaoOK}</p>
            </div>
        `
        
        return html
    }
    
    showError(message) {
        this.showNotification(message, 'error')
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success')
    }
    
    showNotification(message, type) {
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
        `
        
        document.body.appendChild(notification)
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease'
            setTimeout(() => notification.remove(), 300)
        }, 3000)
    }
}

export const auditoriaModule = new AuditoriaModule()