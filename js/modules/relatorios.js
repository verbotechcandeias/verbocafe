// js/modules/relatorios.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'

class RelatoriosModule {
    constructor() {
        this.dadosCompras = []
        this.dadosVendas = []
        this.dadosAuditoria = []
    }
    
    async initCompras() {
        await this.carregarCompras()
        this.setupFiltrosCompras()
    }
    
    async initVendas() {
        await this.carregarVendas()
        this.setupFiltrosVendas()
    }
    
    async initAuditoria() {
        await this.carregarAuditorias()
        this.setupFiltrosAuditoria()
    }
    
    async carregarCompras() {
        const { data, error } = await supabaseService.getCompras()
        
        if (error) {
            console.error('Erro ao carregar compras:', error)
            return
        }
        
        this.dadosCompras = data || []
        this.renderizarCompras(this.dadosCompras)
        this.preencherFiltroDatas('compras')
    }
    
    async carregarVendas() {
        const { data, error } = await supabaseService.getVendas()
        
        if (error) {
            console.error('Erro ao carregar vendas:', error)
            return
        }
        
        this.dadosVendas = data || []
        this.renderizarVendas(this.dadosVendas)
        this.preencherFiltroDatas('vendas')
    }
    
    async carregarAuditorias() {
        const { data, error } = await supabaseService.getAuditorias()
        
        if (error) {
            console.error('Erro ao carregar auditorias:', error)
            return
        }
        
        this.dadosAuditoria = data || []
        this.renderizarAuditoria(this.dadosAuditoria)
        this.preencherFiltroDatas('auditoria')
    }
    
    renderizarCompras(dados) {
        const tbody = document.getElementById('tbodyRelatorioCompras')
        const tfoot = document.getElementById('tfootRelatorioCompras')
        
        if (!tbody) return
        
        tbody.innerHTML = ''
        let totalQuantidade = 0
        let totalValor = 0
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        dados.forEach(compra => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${formatters.formatDate(compra.data_compra)}</td>
                <td>${compra.codigo_produto}</td>
                <td>${compra.descricao_produto}</td>
                <td>${compra.fornecedor}</td>
                <td>${compra.categoria}</td>
                <td>${compra.quantidade}</td>
                <td>${formatters.formatCurrency(compra.valor_compra)}</td>
            `
            tbody.appendChild(tr)
            
            totalQuantidade += compra.quantidade
            totalValor += parseFloat(compra.valor_compra)
        })
        
        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="5"><strong>TOTAL</strong></td>
                    <td><strong>${totalQuantidade}</strong></td>
                    <td><strong>${formatters.formatCurrency(totalValor)}</strong></td>
                </tr>
            `
        }
    }
    
    renderizarVendas(dados) {
        const tbody = document.getElementById('tbodyRelatorioVendas')
        const tfoot = document.getElementById('tfootRelatorioVendas')
        
        if (!tbody) return
        
        tbody.innerHTML = ''
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        const vendasAgrupadas = this.agruparVendasPorData(dados)
        let totalQuantidade = 0
        let totalVendas = 0
        let totalLucro = 0
        
        Object.entries(vendasAgrupadas).forEach(([data, vendas]) => {
            vendas.forEach(venda => {
                const lucro = this.calcularLucro(venda)
                const percentualLucro = this.calcularPercentualLucro(venda)
                
                const tr = document.createElement('tr')
                tr.innerHTML = `
                    <td>${formatters.formatDateTime(venda.data_venda)}</td>
                    <td>${venda.descricao_produto}</td>
                    <td>${venda.fornecedor}</td>
                    <td>${venda.categoria}</td>
                    <td>${venda.quantidade}</td>
                    <td>${formatters.formatCurrency(venda.valor_total)}</td>
                    <td>${percentualLucro.toFixed(2)}%</td>
                    <td>${formatters.formatCurrency(lucro)}</td>
                `
                tbody.appendChild(tr)
                
                totalQuantidade += venda.quantidade
                totalVendas += parseFloat(venda.valor_total)
                totalLucro += lucro
            })
            
            const subtotal = vendas.reduce((sum, v) => sum + parseFloat(v.valor_total), 0)
            const trSubtotal = document.createElement('tr')
            trSubtotal.style.backgroundColor = '#f8f9fa'
            trSubtotal.style.fontWeight = 'bold'
            trSubtotal.innerHTML = `
                <td colspan="5">Subtotal ${formatters.formatDate(new Date(data))}</td>
                <td colspan="3">${formatters.formatCurrency(subtotal)}</td>
            `
            tbody.appendChild(trSubtotal)
        })
        
        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="4"><strong>TOTAL GERAL</strong></td>
                    <td><strong>${totalQuantidade}</strong></td>
                    <td><strong>${formatters.formatCurrency(totalVendas)}</strong></td>
                    <td>-</td>
                    <td><strong>${formatters.formatCurrency(totalLucro)}</strong></td>
                </tr>
            `
        }
    }
    
    renderizarAuditoria(dados) {
        const tbody = document.getElementById('tbodyRelatorioAuditoria')
        const tfoot = document.getElementById('tfootRelatorioAuditoria')
        
        if (!tbody) return
        
        tbody.innerHTML = ''
        let totalOK = 0
        let totalNaoOK = 0
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        dados.forEach(auditoria => {
            const tr = document.createElement('tr')
            const statusClass = auditoria.status === 'OK' ? 'status-ok' : 'status-nao-ok'
            
            tr.innerHTML = `
                <td>${formatters.formatDateTime(auditoria.data_auditoria)}</td>
                <td>${auditoria.codigo_produto}</td>
                <td>${auditoria.descricao_produto}</td>
                <td>${auditoria.categoria}</td>
                <td>${auditoria.quantidade_fisica}</td>
                <td><span class="status-badge ${statusClass}">${auditoria.status}</span></td>
            `
            tbody.appendChild(tr)
            
            if (auditoria.status === 'OK') {
                totalOK++
            } else {
                totalNaoOK++
            }
        })
        
        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="5"><strong>RESUMO</strong></td>
                    <td>
                        <span class="badge badge-success">OK: ${totalOK}</span>
                        <span class="badge badge-danger" style="margin-left: 10px;">NÃO OK: ${totalNaoOK}</span>
                    </td>
                </tr>
            `
        }
    }
    
    agruparVendasPorData(vendas) {
        const agrupado = {}
        
        vendas.forEach(venda => {
            const data = venda.data_venda.split('T')[0]
            if (!agrupado[data]) {
                agrupado[data] = []
            }
            agrupado[data].push(venda)
        })
        
        return agrupado
    }
    
    calcularLucro(venda) {
        return parseFloat(venda.valor_total) * 0.3
    }
    
    calcularPercentualLucro(venda) {
        return 30
    }
    
    setupFiltrosCompras() {
        const filtroTipo = document.getElementById('filtroTipoCompras')
        if (filtroTipo) {
            filtroTipo.addEventListener('change', () => {
                this.preencherFiltroDatas('compras')
            })
        }
    }
    
    setupFiltrosVendas() {
        const filtroTipo = document.getElementById('filtroTipoVendas')
        if (filtroTipo) {
            filtroTipo.addEventListener('change', () => {
                this.preencherFiltroDatas('vendas')
            })
        }
    }
    
    setupFiltrosAuditoria() {
        const filtroTipo = document.getElementById('filtroTipoAuditoria')
        if (filtroTipo) {
            filtroTipo.addEventListener('change', () => {
                this.preencherFiltroDatas('auditoria')
            })
        }
    }
    
    preencherFiltroDatas(tipo) {
        const filtroTipo = document.getElementById(`filtroTipo${this.capitalizar(tipo)}`)
        const filtroData = document.getElementById(`filtroData${this.capitalizar(tipo)}`)
        
        if (!filtroTipo || !filtroData) return
        
        const tipoFiltro = filtroTipo.value
        const dados = this[`dados${this.capitalizar(tipo)}`]
        
        filtroData.innerHTML = '<option value="">Selecione...</option>'
        
        if (tipoFiltro === 'detalhado') {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            const datasUnicas = [...new Set(dados.map(d => 
                new Date(d[campoData]).toISOString().split('T')[0]
            ))].sort().reverse()
            
            datasUnicas.forEach(data => {
                const option = document.createElement('option')
                option.value = data
                option.textContent = formatters.formatDate(new Date(data))
                filtroData.appendChild(option)
            })
        } else {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            const mesesUnicos = [...new Set(dados.map(d => {
                const date = new Date(d[campoData])
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            }))].sort().reverse()
            
            const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
            
            mesesUnicos.forEach(mes => {
                const [ano, mesNum] = mes.split('-')
                const option = document.createElement('option')
                option.value = mes
                option.textContent = `${meses[parseInt(mesNum) - 1]} de ${ano}`
                filtroData.appendChild(option)
            })
        }
    }
    
    capitalizar(str) {
        return str.charAt(0).toUpperCase() + str.slice(1)
    }
    
    aplicarFiltroCompras() {
        const dadosFiltrados = this.filtrarDados('compras')
        this.renderizarCompras(dadosFiltrados)
    }
    
    aplicarFiltroVendas() {
        const dadosFiltrados = this.filtrarDados('vendas')
        this.renderizarVendas(dadosFiltrados)
    }
    
    aplicarFiltroAuditoria() {
        const dadosFiltrados = this.filtrarDados('auditoria')
        this.renderizarAuditoria(dadosFiltrados)
    }
    
    filtrarDados(tipo) {
        const filtroTipo = document.getElementById(`filtroTipo${this.capitalizar(tipo)}`)
        const filtroData = document.getElementById(`filtroData${this.capitalizar(tipo)}`)
        
        if (!filtroTipo || !filtroData || !filtroData.value) {
            return this[`dados${this.capitalizar(tipo)}`]
        }
        
        const tipoFiltro = filtroTipo.value
        const dados = this[`dados${this.capitalizar(tipo)}`]
        const valorFiltro = filtroData.value
        
        if (tipoFiltro === 'detalhado') {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            return dados.filter(d => {
                return new Date(d[campoData]).toISOString().split('T')[0] === valorFiltro
            })
        } else {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            return dados.filter(d => {
                const date = new Date(d[campoData])
                const mesAno = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                return mesAno === valorFiltro
            })
        }
    }
    
    exportarPDFCompras() {
        this.exportarPDF('compras')
    }
    
    exportarPDFVendas() {
        this.exportarPDF('vendas')
    }
    
    exportarPDFAuditoria() {
        this.exportarPDF('auditoria')
    }
    
    exportarPDF(tipo) {
        const titulo = `Relatório de ${this.capitalizar(tipo)}`
        const tabela = document.getElementById(`tabelaRelatorio${this.capitalizar(tipo)}`)
        
        if (!tabela) return
        
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${titulo} - Verbo Café</title>
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
                        .badge {
                            padding: 5px 10px;
                            border-radius: 20px;
                            font-size: 12px;
                        }
                        .badge-success {
                            background: #d4edda;
                            color: #155724;
                        }
                        .badge-danger {
                            background: #f8d7da;
                            color: #721c24;
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 20px;
                        }
                        @media print {
                            body { padding: 0; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Verbo Café - ${titulo}</h1>
                        <p><strong>Data de emissão:</strong> ${formatters.formatDateTime(new Date())}</p>
                    </div>
                    ${tabela.outerHTML}
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
}

export const relatoriosModule = new RelatoriosModule()