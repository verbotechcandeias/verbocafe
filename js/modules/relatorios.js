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
    
    // Método para extrair data no formato YYYY-MM-DD considerando fuso local
    extrairDataLocal(dataString) {
        if (!dataString) return null
        
        const data = new Date(dataString)
        if (isNaN(data.getTime())) return null
        
        const ano = data.getFullYear()
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        const dia = String(data.getDate()).padStart(2, '0')
        
        return `${ano}-${mes}-${dia}`
    }
    
    // Método para extrair mês/ano no formato YYYY-MM
    extrairMesAnoLocal(dataString) {
        if (!dataString) return null
        
        const data = new Date(dataString)
        if (isNaN(data.getTime())) return null
        
        const ano = data.getFullYear()
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        
        return `${ano}-${mes}`
    }
    
    formatarDataExibicao(dataString) {
        if (!dataString) return '-'
        
        // Se já estiver no formato YYYY-MM-DD
        if (typeof dataString === 'string' && dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [ano, mes, dia] = dataString.split('-')
            return `${dia}/${mes}/${ano}`
        }
        
        const data = new Date(dataString)
        if (isNaN(data.getTime())) return '-'
        
        const dia = String(data.getDate()).padStart(2, '0')
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        const ano = data.getFullYear()
        
        return `${dia}/${mes}/${ano}`
    }
    
    formatarDataHoraExibicao(dataString) {
        if (!dataString) return '-'
        
        const data = new Date(dataString)
        if (isNaN(data.getTime())) return '-'
        
        const dia = String(data.getDate()).padStart(2, '0')
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        const ano = data.getFullYear()
        const horas = String(data.getHours()).padStart(2, '0')
        const minutos = String(data.getMinutes()).padStart(2, '0')
        
        return `${dia}/${mes}/${ano} ${horas}:${minutos}`
    }
    
    async carregarCompras() {
        try {
            const { data, error } = await supabaseService.getCompras()
            
            if (error) {
                console.error('Erro ao carregar compras:', error)
                return
            }
            
            this.dadosCompras = data || []
            console.log('Compras carregadas:', this.dadosCompras.length)
            this.renderizarCompras(this.dadosCompras)
            this.preencherFiltroDatas('compras')
        } catch (err) {
            console.error('Erro ao carregar compras:', err)
        }
    }
    
    async carregarVendas() {
        try {
            const { data, error } = await supabaseService.getVendas()
            
            if (error) {
                console.error('Erro ao carregar vendas:', error)
                return
            }
            
            this.dadosVendas = data || []
            console.log('Vendas carregadas:', this.dadosVendas.length)
            
            // Log para debug das datas
            this.dadosVendas.forEach(venda => {
                console.log('Data original:', venda.data_venda, '→ Data extraída:', this.extrairDataLocal(venda.data_venda))
            })
            
            this.renderizarVendas(this.dadosVendas)
            this.preencherFiltroDatas('vendas')
        } catch (err) {
            console.error('Erro ao carregar vendas:', err)
        }
    }
    
    async carregarAuditorias() {
        try {
            const { data, error } = await supabaseService.getAuditorias()
            
            if (error) {
                console.error('Erro ao carregar auditorias:', error)
                return
            }
            
            this.dadosAuditoria = data || []
            console.log('Auditorias carregadas:', this.dadosAuditoria.length)
            this.renderizarAuditoria(this.dadosAuditoria)
            this.preencherFiltroDatas('auditoria')
        } catch (err) {
            console.error('Erro ao carregar auditorias:', err)
        }
    }
    
    renderizarCompras(dados) {
        const tbody = document.getElementById('tbodyRelatorioCompras')
        const tfoot = document.getElementById('tfootRelatorioCompras')
        
        if (!tbody) return
        
        tbody.innerHTML = ''
        let totalQuantidade = 0
        let totalValor = 0
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        // Ordenar por data (mais recente primeiro)
        const dadosOrdenados = [...dados].sort((a, b) => 
            new Date(b.data_compra) - new Date(a.data_compra)
        )
        
        dadosOrdenados.forEach(compra => {
            const tr = document.createElement('tr')
            tr.innerHTML = `
                <td>${this.formatarDataExibicao(compra.data_compra)}</td>
                <td>${compra.codigo_produto || '-'}</td>
                <td>${compra.descricao_produto || '-'}</td>
                <td>${compra.fornecedor || '-'}</td>
                <td>${compra.categoria || '-'}</td>
                <td>${compra.quantidade || 0}</td>
                <td>${formatters.formatCurrency(compra.valor_compra)}</td>
            `
            tbody.appendChild(tr)
            
            totalQuantidade += compra.quantidade || 0
            totalValor += parseFloat(compra.valor_compra) || 0
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
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        // Agrupar vendas por data
        const vendasAgrupadas = this.agruparVendasPorData(dados)
        let totalGeralQuantidade = 0
        let totalGeralVendas = 0
        let totalGeralLucro = 0
        
        // Ordenar datas em ordem decrescente
        const datasOrdenadas = Object.keys(vendasAgrupadas).sort().reverse()
        
        datasOrdenadas.forEach(data => {
            const vendas = vendasAgrupadas[data]
            
            // Variáveis para subtotal do dia
            let subtotalQuantidade = 0
            let subtotalVendas = 0
            let subtotalLucro = 0
            
            // Renderizar cada venda do dia
            vendas.forEach(venda => {
                const lucro = this.calcularLucro(venda)
                const percentualLucro = this.calcularPercentualLucro(venda)
                
                const tr = document.createElement('tr')
                tr.innerHTML = `
                    <td>${this.formatarDataHoraExibicao(venda.data_venda)}</td>
                    <td>${venda.descricao_produto || '-'}</td>
                    <td>${venda.fornecedor || '-'}</td>
                    <td>${venda.categoria || '-'}</td>
                    <td>${venda.quantidade || 0}</td>
                    <td>${formatters.formatCurrency(venda.valor_total)}</td>
                    <td>${percentualLucro.toFixed(2)}%</td>
                    <td>${formatters.formatCurrency(lucro)}</td>
                `
                tbody.appendChild(tr)
                
                // Acumular subtotais do dia
                subtotalQuantidade += venda.quantidade || 0
                subtotalVendas += parseFloat(venda.valor_total) || 0
                subtotalLucro += lucro
                
                // Acumular totais gerais
                totalGeralQuantidade += venda.quantidade || 0
                totalGeralVendas += parseFloat(venda.valor_total) || 0
                totalGeralLucro += lucro
            })
            
            // Adicionar linha de subtotal por data com todas as colunas
            const trSubtotal = document.createElement('tr')
            trSubtotal.style.backgroundColor = '#f8f9fa'
            trSubtotal.style.fontWeight = 'bold'
            trSubtotal.style.borderTop = '2px solid #dee2e6'
            trSubtotal.innerHTML = `
                <td colspan="4" style="text-align: right;">
                    <strong>Subtotal ${this.formatarDataExibicao(data)}</strong>
                </td>
                <td><strong>${subtotalQuantidade}</strong></td>
                <td><strong>${formatters.formatCurrency(subtotalVendas)}</strong></td>
                <td>-</td>
                <td><strong>${formatters.formatCurrency(subtotalLucro)}</strong></td>
            `
            tbody.appendChild(trSubtotal)
        })
        
        // Adicionar linha de total geral no tfoot
        if (tfoot) {
            tfoot.innerHTML = `
                <tr style="background-color: #e9ecef; font-weight: bold; border-top: 3px solid #8B4513;">
                    <td colspan="4" style="text-align: right;"><strong>TOTAL GERAL</strong></td>
                    <td><strong>${totalGeralQuantidade}</strong></td>
                    <td><strong>${formatters.formatCurrency(totalGeralVendas)}</strong></td>
                    <td>-</td>
                    <td><strong>${formatters.formatCurrency(totalGeralLucro)}</strong></td>
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
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        // Ordenar por data (mais recente primeiro)
        const dadosOrdenados = [...dados].sort((a, b) => 
            new Date(b.data_auditoria) - new Date(a.data_auditoria)
        )
        
        dadosOrdenados.forEach(auditoria => {
            const tr = document.createElement('tr')
            const statusClass = auditar.status === 'OK' ? 'status-ok' : 'status-nao-ok'
            
            tr.innerHTML = `
                <td>${this.formatarDataHoraExibicao(auditoria.data_auditoria)}</td>
                <td>${auditoria.codigo_produto || '-'}</td>
                <td>${auditoria.descricao_produto || '-'}</td>
                <td>${auditoria.categoria || '-'}</td>
                <td>${auditoria.quantidade_fisica || 0}</td>
                <td><span class="status-badge ${statusClass}">${auditoria.status || '-'}</span></td>
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
            const data = this.extrairDataLocal(venda.data_venda)
            
            if (data) {
                if (!agrupado[data]) {
                    agrupado[data] = []
                }
                agrupado[data].push(venda)
            }
        })
        
        return agrupado
    }
    
    calcularLucro(venda) {
        // Estimativa de 30% de margem de lucro
        return (parseFloat(venda.valor_total) || 0) * 0.3
    }
    
    calcularPercentualLucro(venda) {
        // Margem fixa de 30%
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
        const dados = this[`dados${this.capitalizar(tipo)}`] || []
        
        console.log(`Preenchendo filtro para ${tipo}, tipo: ${tipoFiltro}, dados: ${dados.length}`)
        
        filtroData.innerHTML = '<option value="">Selecione...</option>'
        
        if (tipoFiltro === 'detalhado') {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            // Usar extrairDataLocal para obter datas no fuso correto
            const datasUnicas = [...new Set(dados.map(d => {
                return this.extrairDataLocal(d[campoData])
            }))].filter(d => d !== null).sort().reverse()
            
            console.log('Datas únicas encontradas:', datasUnicas)
            
            datasUnicas.forEach(data => {
                const option = document.createElement('option')
                option.value = data
                const [ano, mes, dia] = data.split('-')
                option.textContent = `${dia}/${mes}/${ano}`
                filtroData.appendChild(option)
            })
        } else {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            const mesesUnicos = [...new Set(dados.map(d => {
                return this.extrairMesAnoLocal(d[campoData])
            }))].filter(m => m !== null).sort().reverse()
            
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
        if (!str) return ''
        return str.charAt(0).toUpperCase() + str.slice(1)
    }
    
    aplicarFiltroCompras() {
        console.log('Aplicando filtro de compras...')
        const dadosFiltrados = this.filtrarDados('compras')
        this.renderizarCompras(dadosFiltrados)
    }
    
    aplicarFiltroVendas() {
        console.log('Aplicando filtro de vendas...')
        const dadosFiltrados = this.filtrarDados('vendas')
        this.renderizarVendas(dadosFiltrados)
    }
    
    aplicarFiltroAuditoria() {
        console.log('Aplicando filtro de auditoria...')
        const dadosFiltrados = this.filtrarDados('auditoria')
        this.renderizarAuditoria(dadosFiltrados)
    }
    
    filtrarDados(tipo) {
        const filtroTipo = document.getElementById(`filtroTipo${this.capitalizar(tipo)}`)
        const filtroData = document.getElementById(`filtroData${this.capitalizar(tipo)}`)
        
        if (!filtroTipo || !filtroData || !filtroData.value) {
            console.log('Filtro não selecionado, retornando todos os dados')
            return this[`dados${this.capitalizar(tipo)}`] || []
        }
        
        const tipoFiltro = filtroTipo.value
        const dados = this[`dados${this.capitalizar(tipo)}`] || []
        const valorFiltro = filtroData.value
        
        console.log(`Filtrando ${tipo}: tipo=${tipoFiltro}, valor=${valorFiltro}`)
        
        if (tipoFiltro === 'detalhado') {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            const dadosFiltrados = dados.filter(d => {
                const dataItem = this.extrairDataLocal(d[campoData])
                return dataItem === valorFiltro
            })
            
            console.log(`Dados filtrados: ${dadosFiltrados.length} de ${dados.length}`)
            return dadosFiltrados
        } else {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            return dados.filter(d => {
                const mesAno = this.extrairMesAnoLocal(d[campoData])
                return mesAno === valorFiltro
            })
        }
    }
    
    exportarPDFCompras() {
        this.exportarPDF('compras', 'Relatório de Compras')
    }
    
    exportarPDFVendas() {
        this.exportarPDF('vendas', 'Relatório de Vendas')
    }
    
    exportarPDFAuditoria() {
        this.exportarPDF('auditoria', 'Relatório de Auditoria')
    }
    
    exportarPDF(tipo, titulo) {
        const tabela = document.getElementById(`tabelaRelatorio${this.capitalizar(tipo)}`)
        
        if (!tabela) {
            console.error('Tabela não encontrada')
            return
        }
        
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