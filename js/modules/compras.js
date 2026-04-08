// js/modules/compras.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'

class ComprasModule {
    constructor() {
        this.compras = []
        this.compraSelecionada = null
    }
    
    async init() {
        this.setupEventListeners()
        this.setDataCompra()
        await this.carregarCompras()
    }
    
    setupEventListeners() {
        // Calcula valor total quando quantidade ou valor unitário mudar
        const quantidade = document.getElementById('quantidade')
        const valorCompra = document.getElementById('valorCompra')
        
        if (quantidade && valorCompra) {
            const updateTotal = () => {
                const qtd = parseFloat(quantidade.value) || 0
                const valor = parseFloat(valorCompra.value) || 0
                // Aqui você pode adicionar lógica de cálculo se necessário
            }
            
            quantidade.addEventListener('input', updateTotal)
            valorCompra.addEventListener('input', updateTotal)
        }
    }
    
    setDataCompra() {
        const dataInput = document.getElementById('dataCompra')
        if (dataInput) {
            dataInput.value = formatters.formatDate(new Date())
        }
    }
    
    async carregarCompras() {
        const { data, error } = await supabaseService.getCompras()
        
        if (error) {
            this.showError('Erro ao carregar compras: ' + error.message)
            return
        }
        
        this.compras = data || []
        this.renderizarTabela()
    }
    
    renderizarTabela() {
        const tbody = document.getElementById('tbodyCompras')
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        this.compras.forEach(compra => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${formatters.formatDate(new Date(compra.data_compra))}</td>
                <td>${compra.codigo_produto}</td>
                <td>${compra.descricao_produto}</td>
                <td>${compra.fornecedor}</td>
                <td>${compra.categoria}</td>
                <td>${compra.quantidade}</td>
                <td>${formatters.formatCurrency(compra.valor_compra)}</td>
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
        
        // Adiciona estilos para os botões
        const style = document.createElement('style')
        style.textContent = `
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
        `
        if (!document.querySelector('#btn-icon-styles')) {
            style.id = 'btn-icon-styles'
            document.head.appendChild(style)
        }
    }
    
    async cadastrar() {
        const compra = this.getFormData()
        
        if (!this.validarForm(compra)) {
            return
        }
        
        const { data, error } = await supabaseService.saveCompra(compra)
        
        if (error) {
            this.showError('Erro ao cadastrar compra: ' + error.message)
            return
        }
        
        this.showSuccess('Compra cadastrada com sucesso!')
        this.limparForm()
        await this.carregarCompras()
    }
    
    async alterar() {
        if (!this.compraSelecionada) {
            this.showError('Selecione uma compra para alterar')
            return
        }
        
        const compra = this.getFormData()
        
        if (!this.validarForm(compra)) {
            return
        }
        
        const { data, error } = await supabaseService.updateCompra(this.compraSelecionada.id, compra)
        
        if (error) {
            this.showError('Erro ao alterar compra: ' + error.message)
            return
        }
        
        this.showSuccess('Compra alterada com sucesso!')
        this.limparForm()
        this.compraSelecionada = null
        await this.carregarCompras()
    }
    
    async excluir() {
        if (!this.compraSelecionada) {
            this.showError('Selecione uma compra para excluir')
            return
        }
        
        if (!confirm('Tem certeza que deseja excluir esta compra?')) {
            return
        }
        
        const { error } = await supabaseService.deleteCompra(this.compraSelecionada.id)
        
        if (error) {
            this.showError('Erro ao excluir compra: ' + error.message)
            return
        }
        
        this.showSuccess('Compra excluída com sucesso!')
        this.limparForm()
        this.compraSelecionada = null
        await this.carregarCompras()
    }
    
    selecionarCompra(id) {
        this.compraSelecionada = this.compras.find(c => c.id === id)
        
        if (this.compraSelecionada) {
            document.getElementById('codigoProduto').value = this.compraSelecionada.codigo_produto
            document.getElementById('descricaoProduto').value = this.compraSelecionada.descricao_produto
            document.getElementById('fornecedor').value = this.compraSelecionada.fornecedor
            document.getElementById('categoria').value = this.compraSelecionada.categoria
            document.getElementById('quantidade').value = this.compraSelecionada.quantidade
            document.getElementById('valorCompra').value = this.compraSelecionada.valor_compra
        }
    }
    
    async excluirCompra(id) {
        if (!confirm('Tem certeza que deseja excluir esta compra?')) {
            return
        }
        
        const { error } = await supabaseService.deleteCompra(id)
        
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
    }
    
    limparForm() {
        document.getElementById('codigoProduto').value = ''
        document.getElementById('descricaoProduto').value = ''
        document.getElementById('fornecedor').value = ''
        document.getElementById('categoria').value = ''
        document.getElementById('quantidade').value = ''
        document.getElementById('valorCompra').value = ''
        this.compraSelecionada = null
        this.setDataCompra()
    }
    
    getFormData() {
        return {
            data_compra: new Date().toISOString().split('T')[0],
            codigo_produto: document.getElementById('codigoProduto').value,
            descricao_produto: document.getElementById('descricaoProduto').value,
            fornecedor: document.getElementById('fornecedor').value,
            categoria: document.getElementById('categoria').value,
            quantidade: parseInt(document.getElementById('quantidade').value),
            valor_compra: parseFloat(document.getElementById('valorCompra').value)
        }
    }
    
    validarForm(compra) {
        if (!compra.codigo_produto) {
            this.showError('Código do produto é obrigatório')
            return false
        }
        if (!compra.descricao_produto) {
            this.showError('Descrição do produto é obrigatória')
            return false
        }
        if (!compra.fornecedor) {
            this.showError('Fornecedor é obrigatório')
            return false
        }
        if (!compra.categoria) {
            this.showError('Categoria é obrigatória')
            return false
        }
        if (compra.quantidade <= 0) {
            this.showError('Quantidade deve ser maior que zero')
            return false
        }
        if (compra.valor_compra <= 0) {
            this.showError('Valor de compra deve ser maior que zero')
            return false
        }
        return true
    }
    
    showError(message) {
        alert('❌ ' + message)
    }
    
    showSuccess(message) {
        alert('✅ ' + message)
    }
}

export const comprasModule = new ComprasModule()