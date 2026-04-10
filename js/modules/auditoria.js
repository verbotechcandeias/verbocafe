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
        this.auditoriaEditando = null
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
        this.setDataAuditoriasDia()
        await this.carregarAuditoriasDoDia()
    }

    setDataAuditoriasDia() {
        const dataSpan = document.getElementById('dataAuditoriasDia')
        if (dataSpan) {
            const hoje = new Date()
            const dia = String(hoje.getDate()).padStart(2, '0')
            const mes = String(hoje.getMonth() + 1).padStart(2, '0')
            const ano = hoje.getFullYear()
            dataSpan.textContent = `${dia}/${mes}/${ano}`
        }
    }

    setDataAuditoria() {
        const dataInput = document.getElementById('dataAuditoria')
        if (dataInput) {
            const agora = new Date()
            const dia = String(agora.getDate()).padStart(2, '0')
            const mes = String(agora.getMonth() + 1).padStart(2, '0')
            const ano = agora.getFullYear()
            const horas = String(agora.getHours()).padStart(2, '0')
            const minutos = String(agora.getMinutes()).padStart(2, '0')
            
            // Removido os segundos
            dataInput.value = `${dia}/${mes}/${ano} ${horas}:${minutos}`
            console.log('Data da auditoria definida:', dataInput.value)
        }
    }

    formatarDataHora(data) {
        if (!data) return '-'
        return dateTime.formatDateTime(data)
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
        if (loading) loading.remove()
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

    async carregarProdutos() {
        try {
            const { data, error } = await supabaseService.getProdutos()
            if (error) throw error
            this.produtos = data || []
            this.preencherSelectProdutos()
        } catch (err) {
            console.error('Erro ao carregar produtos:', err)
        }
    }
    
    preencherSelectProdutos() {
        const select = document.getElementById('descricaoAuditoria')
        if (!select) return
        
        select.innerHTML = '<option value="">Selecione um produto...</option>'
        
        this.produtos.forEach(produto => {
            const option = document.createElement('option')
            option.value = produto.id
            option.textContent = produto.descricao_produto
            option.dataset.codigo = String(produto.codigo_produto || '')
            option.dataset.categoria = String(produto.categoria || '')
            option.dataset.quantidadeSistema = String(produto.quantidade || '0')
            select.appendChild(option)
        })
    }

    setupEventListeners() {
        const selectProduto = document.getElementById('descricaoAuditoria')
        if (selectProduto) {
            selectProduto.addEventListener('change', (e) => this.onProdutoSelecionado(e.target))
        }
        
        const form = document.getElementById('formAuditoria')
        if (form) {
            form.addEventListener('submit', (e) => e.preventDefault())
        }
    }

    onProdutoSelecionado(select) {
        const selectedOption = select.options[select.selectedIndex]
        
        if (select.value) {
            document.getElementById('codigoAuditoria').value = selectedOption.dataset.codigo || ''
            document.getElementById('categoriaAuditoria').value = selectedOption.dataset.categoria || ''
            this.mostrarInfoQuantidadeSistema(selectedOption.dataset.quantidadeSistema || '0')
        } else {
            document.getElementById('codigoAuditoria').value = ''
            document.getElementById('categoriaAuditoria').value = ''
            this.esconderInfoQuantidadeSistema()
        }
    }

    adicionarProduto() {
        const select = document.getElementById('descricaoAuditoria')
        const produtoId = select.value
        
        if (!produtoId) {
            this.showError('Selecione um produto')
            return
        }
        
        const selectedOption = select.options[select.selectedIndex]
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
        
        if (this.itensAuditoria.find(item => item.produto_id === produtoId)) {
            this.showError('Este produto já foi adicionado à auditoria')
            return
        }
        
        const quantidadeSistema = parseInt(selectedOption.dataset.quantidadeSistema) || produto.quantidade || 0
        const status = quantidadeFisica === quantidadeSistema ? 'OK' : 'NÃO OK'
        
        this.itensAuditoria.push({
            produto_id: produto.id,
            codigo_produto: produto.codigo_produto,
            descricao_produto: produto.descricao_produto,
            categoria: produto.categoria,
            quantidade_fisica: quantidadeFisica,
            quantidade_sistema: quantidadeSistema,
            status: status,
            diferenca: quantidadeFisica - quantidadeSistema
        })
        
        this.renderizarItensAuditoria()
        this.limparFormProduto()
    }

    limparFormProduto() {
        document.getElementById('descricaoAuditoria').value = ''
        document.getElementById('codigoAuditoria').value = ''
        document.getElementById('categoriaAuditoria').value = ''
        document.getElementById('quantidadeAuditoria').value = ''
    }

    renderizarItensAuditoria() {
        const tbody = document.getElementById('tbodyItensAuditoria')
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        if (this.itensAuditoria.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;"><i class="fas fa-info-circle"></i> Nenhum produto adicionado à auditoria</td></tr>'
            return
        }
        
        const modoEdicao = this.auditoriaEditando !== null
        
        this.itensAuditoria.forEach((item, index) => {
            const tr = document.createElement('tr')
            const statusClass = item.status === 'OK' ? 'status-ok' : 'status-nao-ok'
            
            if (modoEdicao) {
                tr.innerHTML = `
                    <td>${item.codigo_produto || '-'}</td>
                    <td>${item.descricao_produto || '-'}</td>
                    <td>${item.categoria || '-'}</td>
                    <td>
                        <div class="quantidade-editor" onclick="event.stopPropagation()">
                            <button type="button" class="btn-qtd" onclick="auditoriaModule.diminuirQuantidadeAuditoria(${index}); return false;">-</button>
                            <input type="number" class="input-qtd" id="qtdFisica_${index}" value="${item.quantidade_fisica}" min="0" 
                                onchange="auditoriaModule.atualizarQuantidadeAuditoria(${index}, this.value)"
                                onclick="event.stopPropagation(); this.select()">
                            <button type="button" class="btn-qtd" onclick="auditoriaModule.aumentarQuantidadeAuditoria(${index}); return false;">+</button>
                        </div>
                    </td>
                    <td>${item.quantidade_sistema || 0}</td>
                    <td><span class="status-badge ${statusClass}">${item.status || '-'}</span></td>
                    <td>
                        <button type="button" class="btn-icon" onclick="auditoriaModule.removerItemAuditoria(${index})"><i class="fas fa-trash"></i></button>
                    </td>
                `
            } else {
                tr.innerHTML = `
                    <td>${item.codigo_produto || '-'}</td>
                    <td>${item.descricao_produto || '-'}</td>
                    <td>${item.categoria || '-'}</td>
                    <td>${item.quantidade_fisica || 0}</td>
                    <td>${item.quantidade_sistema || 0}</td>
                    <td><span class="status-badge ${statusClass}">${item.status || '-'}</span></td>
                    <td>
                        <button type="button" class="btn-icon" onclick="auditoriaModule.removerItemAuditoria(${index})"><i class="fas fa-trash"></i></button>
                    </td>
                `
            }
            tbody.appendChild(tr)
        })
        
        this.adicionarEstilosAuditoria()
    }

    adicionarEstilosAuditoria() {
        if (document.querySelector('#auditoria-styles')) return
        
        const style = document.createElement('style')
        style.id = 'auditoria-styles'
        style.textContent = `
            .status-badge { padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .status-ok { background: #d4edda; color: #155724; }
            .status-nao-ok { background: #f8d7da; color: #721c24; }
            .btn-icon { background: none; border: none; cursor: pointer; padding: 5px 8px; margin: 0 3px; border-radius: 4px; min-height: 44px; min-width: 44px; }
            .btn-icon:hover { background: #f0f0f0; }
            .btn-icon .fa-trash { color: #dc3545; }
            #btnAlterarAuditoria { background: #6c5ce7; color: white; }
            #btnAlterarAuditoria:hover { background: #5b4bc4; }
            .quantidade-editor { display: flex; align-items: center; gap: 5px; min-width: 120px; }
            .btn-qtd { width: 32px; height: 32px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
            .btn-qtd:hover { background: #f0f0f0; border-color: #8B4513; color: #8B4513; }
            .input-qtd { width: 70px; height: 32px; text-align: center; border: 1px solid #ddd; border-radius: 4px; }
            .input-qtd:focus { outline: none; border-color: #8B4513; }
            .input-qtd::-webkit-outer-spin-button, .input-qtd::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .input-qtd[type=number] { -moz-appearance: textfield; appearance: textfield; }
        `
        document.head.appendChild(style)
    }

    aumentarQuantidadeAuditoria(index) {
        const item = this.itensAuditoria[index]
        if (!item) return false
        item.quantidade_fisica++
        this.atualizarStatusItem(item)
        document.getElementById(`qtdFisica_${index}`).value = item.quantidade_fisica
        this.atualizarCelulaStatus(index, item)
        return false
    }

    diminuirQuantidadeAuditoria(index) {
        const item = this.itensAuditoria[index]
        if (!item || item.quantidade_fisica <= 0) return false
        item.quantidade_fisica--
        this.atualizarStatusItem(item)
        document.getElementById(`qtdFisica_${index}`).value = item.quantidade_fisica
        this.atualizarCelulaStatus(index, item)
        return false
    }

    atualizarQuantidadeAuditoria(index, novaQuantidade) {
        const item = this.itensAuditoria[index]
        if (!item) return
        item.quantidade_fisica = Math.max(0, parseInt(novaQuantidade) || 0)
        this.atualizarStatusItem(item)
        this.atualizarCelulaStatus(index, item)
    }

    atualizarStatusItem(item) {
        item.status = item.quantidade_fisica === item.quantidade_sistema ? 'OK' : 'NÃO OK'
        item.diferenca = item.quantidade_fisica - item.quantidade_sistema
    }

    atualizarCelulaStatus(index, item) {
        const tr = document.getElementById('tbodyItensAuditoria')?.children[index]
        if (tr) {
            const statusClass = item.status === 'OK' ? 'status-ok' : 'status-nao-ok'
            tr.cells[5].innerHTML = `<span class="status-badge ${statusClass}">${item.status}</span>`
        }
    }

    async removerItemAuditoria(index) {
        const item = this.itensAuditoria[index]
        if (!item) return
        
        if (await this.showConfirm({
            title: 'Remover Item',
            message: `Deseja remover "${item.descricao_produto}" da auditoria?`,
            confirmText: 'Remover',
            cancelText: 'Cancelar',
            type: 'warning',
            icon: 'fa-trash-alt'
        })) {
            this.itensAuditoria.splice(index, 1)
            this.renderizarItensAuditoria()
            this.showSuccess('Item removido da auditoria')
        }
    }

    async realizarAuditoria() {
        if (this.itensAuditoria.length === 0) {
            this.showError('Adicione pelo menos um produto para auditar')
            return
        }
        
        try {
            this.showLoading('Realizando auditoria...')
            
            const dataAuditoria = new Date().toISOString()
            const auditoriasParaSalvar = this.itensAuditoria.map(item => ({
                data_auditoria: dataAuditoria,
                codigo_produto: item.codigo_produto,
                descricao_produto: item.descricao_produto,
                categoria: item.categoria,
                quantidade_fisica: item.quantidade_fisica,
                quantidade_sistema: item.quantidade_sistema,
                status: item.status
            }))
            
            const { error } = await supabaseService.saveAuditoria(auditoriasParaSalvar)
            
            this.hideLoading()
            
            if (error) {
                this.showError('Erro ao salvar auditoria: ' + error.message)
                return
            }
            
            this.showSuccess('Auditoria realizada com sucesso!')
            this.auditoriaAtual = { data: dataAuditoria, itens: this.itensAuditoria }
            this.limparFormularioAuditoria()
            await this.carregarAuditoriasDoDia()
            
        } catch (err) {
            this.hideLoading()
            this.showError('Erro ao realizar auditoria')
        }
    }

    limparFormularioAuditoria() {
        this.itensAuditoria = []
        this.auditoriaEditando = null
        this.limparFormProduto()
        this.renderizarItensAuditoria()
        this.alternarBotoesAuditoria(false)
        this.setDataAuditoria()
    }

    alternarBotoesAuditoria(modoEdicao) {
        const btnRealizar = document.getElementById('btnRealizarAuditoria')
        const btnAlterar = document.getElementById('btnAlterarAuditoria')
        if (btnRealizar && btnAlterar) {
            btnRealizar.style.display = modoEdicao ? 'none' : 'inline-flex'
            btnAlterar.style.display = modoEdicao ? 'inline-flex' : 'none'
        }
    }

    async cancelarAuditoria() {
        if (this.itensAuditoria.length > 0 || this.auditoriaEditando) {
            const mensagem = this.auditoriaEditando ? 
                'Cancelar edição da auditoria? As alterações serão perdidas.' : 
                'Cancelar esta auditoria? Os itens adicionados serão perdidos.'
            
            if (!await this.showConfirm({
                title: this.auditoriaEditando ? 'Cancelar Edição' : 'Cancelar Auditoria',
                message: mensagem,
                confirmText: 'Sim, cancelar',
                cancelText: 'Não, continuar',
                type: 'warning',
                icon: 'fa-exclamation-triangle'
            })) return
        }
        
        this.itensAuditoria = []
        this.auditoriaEditando = null
        this.limparFormProduto()
        this.renderizarItensAuditoria()
        this.alternarBotoesAuditoria(false)
        this.setDataAuditoria()
    }

    async carregarAuditoriasDoDia() {
        try {
            const { data, error } = await supabaseService.getAuditorias()
            if (error) throw error
            
            const dataHoje = dateTime.getHojeISO()
            const auditoriasDoDia = (data || []).filter(a => 
                dateTime.extrairDataLocal(a.data_auditoria) === dataHoje
            )
            
            this.renderizarAuditoriasDoDia(auditoriasDoDia)
        } catch (err) {
            console.error('Erro ao carregar auditorias do dia:', err)
        }
    }

    renderizarAuditoriasDoDia(auditorias) {
        const tbody = document.getElementById('tbodyAuditoriasDia')
        if (!tbody) return
        
        tbody.innerHTML = ''
        let totalOK = 0, totalNaoOK = 0
        
        if (!auditorias?.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #999;"><i class="fas fa-info-circle"></i> Nenhuma auditoria realizada hoje</td></tr>'
            document.getElementById('resumoStatusDia').textContent = 'OK: 0 | NÃO OK: 0'
            return
        }
        
        const auditoriasAgrupadas = {}
        auditorias.sort((a, b) => new Date(b.data_auditoria) - new Date(a.data_auditoria))
            .forEach(a => {
                if (!auditoriasAgrupadas[a.data_auditoria]) auditoriasAgrupadas[a.data_auditoria] = []
                auditoriasAgrupadas[a.data_auditoria].push(a)
            })
        
        Object.entries(auditoriasAgrupadas).forEach(([dataHora, itens]) => {
            itens.forEach(auditoria => {
                const statusClass = auditoria.status === 'OK' ? 'status-ok' : 'status-nao-ok'
                const tr = document.createElement('tr')
                tr.innerHTML = `
                    <td>${this.formatarDataHora(auditoria.data_auditoria)}</td>
                    <td>${auditoria.codigo_produto || '-'}</td>
                    <td>${auditoria.descricao_produto || '-'}</td>
                    <td>${auditoria.categoria || '-'}</td>
                    <td>${auditoria.quantidade_fisica || 0}</td>
                    <td>${auditoria.quantidade_sistema || 0}</td>
                    <td><span class="status-badge ${statusClass}">${auditoria.status || '-'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="auditoriaModule.editarAuditoria('${auditoria.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon" onclick="auditoriaModule.excluirAuditoria('${auditoria.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `
                tbody.appendChild(tr)
                auditoria.status === 'OK' ? totalOK++ : totalNaoOK++
            })
        })
        
        document.getElementById('resumoStatusDia').textContent = `OK: ${totalOK} | NÃO OK: ${totalNaoOK}`
    }

    async editarAuditoria(id) {
        try {
            this.showLoading('Carregando auditoria...')
            
            const { data: auditoria, error } = await supabaseService.getAuditoriaById(id)
            if (error) throw error
            if (!auditoria) { this.showError('Auditoria não encontrada'); return }
            
            const { data: todas } = await supabaseService.getAuditorias()
            const itensMesmaAuditoria = (todas || []).filter(a => a.data_auditoria === auditoria.data_auditoria)
            
            this.auditoriaEditando = { data: auditoria.data_auditoria, itens: itensMesmaAuditoria }
            this.itensAuditoria = itensMesmaAuditoria.map(item => ({
                id: item.id, produto_id: item.produto_id, codigo_produto: item.codigo_produto,
                descricao_produto: item.descricao_produto, categoria: item.categoria,
                quantidade_fisica: item.quantidade_fisica, quantidade_sistema: item.quantidade_sistema,
                status: item.status, diferenca: item.quantidade_fisica - item.quantidade_sistema
            }))
            
            this.hideLoading()
            this.renderizarItensAuditoria()
            this.alternarBotoesAuditoria(true)
            this.showSuccess('Auditoria carregada para edição')
            document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            
        } catch (err) {
            this.hideLoading()
            this.showError('Erro ao carregar auditoria')
        }
    }

    async confirmarAlteracao() {
        if (!this.itensAuditoria.length) { this.showError('Adicione pelo menos um produto'); return }
        if (!this.auditoriaEditando) { this.showError('Nenhuma auditoria em edição'); return }
        
        try {
            this.showLoading('Atualizando auditoria...')
            
            for (const item of this.auditoriaEditando.itens) {
                await supabaseService.deleteAuditoria(item.id)
            }
            
            const auditoriasParaSalvar = this.itensAuditoria.map(item => ({
                data_auditoria: this.auditoriaEditando.data,
                codigo_produto: item.codigo_produto,
                descricao_produto: item.descricao_produto,
                categoria: item.categoria,
                quantidade_fisica: item.quantidade_fisica,
                quantidade_sistema: item.quantidade_sistema,
                status: item.status
            }))
            
            const { error } = await supabaseService.saveAuditoria(auditoriasParaSalvar)
            if (error) throw error
            
            this.hideLoading()
            this.showSuccess('Auditoria atualizada com sucesso!')
            this.limparFormularioAuditoria()
            await this.carregarAuditoriasDoDia()
            
        } catch (err) {
            this.hideLoading()
            this.showError('Erro ao atualizar auditoria')
        }
    }

    async excluirAuditoria(id) {
        if (!await this.showConfirm({
            title: 'Excluir Auditoria',
            message: 'Tem certeza que deseja excluir este item da auditoria?',
            confirmText: 'Sim, excluir',
            cancelText: 'Cancelar',
            type: 'danger',
            icon: 'fa-trash-alt'
        })) return
        
        try {
            this.showLoading('Excluindo...')
            const { error } = await supabaseService.deleteAuditoria(id)
            if (error) throw error
            
            this.hideLoading()
            this.showSuccess('Auditoria excluída!')
            await this.carregarAuditoriasDoDia()
            if (this.auditoriaEditando) this.cancelarAuditoria()
        } catch (err) {
            this.hideLoading()
            this.showError('Erro ao excluir')
        }
    }

    atualizarListaAuditorias() {
        this.carregarAuditoriasDoDia()
        this.showSuccess('Lista atualizada!')
    }

    async exportarPDF() {
        if (!this.auditoriaAtual) {
            this.showError('Nenhuma auditoria realizada para exportar')
            return
        }
        
        const data = formatters.formatDateTime(new Date(this.auditoriaAtual.data))
        const itens = this.auditoriaAtual.itens
        let totalOK = 0, totalNaoOK = 0
        
        let html = `
            <div style="font-family: Arial; padding: 20px;">
                <h1 style="color: #8B4513;">Verbo Café - Relatório de Auditoria</h1>
                <p><strong>Data:</strong> ${data}</p>
                <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                    <thead>
                        <tr style="background:#8B4513; color:white;">
                            <th style="padding:8px;">Código</th><th>Descrição</th><th>Categoria</th><th>Qtd Física</th><th>Qtd Sistema</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>`
        
        itens.forEach(item => {
            const statusClass = item.status === 'OK' ? 'green' : 'red'
            item.status === 'OK' ? totalOK++ : totalNaoOK++
            html += `<tr>
                <td style="padding:8px; border:1px solid #ddd;">${item.codigo_produto}</td>
                <td style="border:1px solid #ddd;">${item.descricao_produto}</td>
                <td style="border:1px solid #ddd;">${item.categoria}</td>
                <td style="border:1px solid #ddd;">${item.quantidade_fisica}</td>
                <td style="border:1px solid #ddd;">${item.quantidade_sistema}</td>
                <td style="border:1px solid #ddd; color:${statusClass}; font-weight:bold;">${item.status}</td>
            </tr>`
        })
        
        html += `</tbody></table>
            <div style="margin-top:20px;"><strong>Itens OK:</strong> ${totalOK} | <strong>Divergentes:</strong> ${totalNaoOK}</div>
            </div><script>window.onload=function(){window.print();}</script>`
        
        const w = window.open('', '_blank')
        w.document.write(html)
        w.document.close()
    }
}

export const auditoriaModule = new AuditoriaModule()