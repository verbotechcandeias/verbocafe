// js/modules/relatorios.js
import { supabaseService } from '../supabase-config.js'
import * as formatters from '../utils/formatters.js'
import * as dateTime from '../utils/datetime.js'

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
        return dateTime.extrairDataLocal(dataString)
    }
    
    // Método para extrair mês/ano no formato YYYY-MM
    extrairMesAnoLocal(dataString) {
        return dateTime.extrairMesAnoLocal(dataString)
    }
    
    formatarDataExibicao(dataString) {
        return dateTime.formatDate(dataString)
    }
    
    formatarDataHoraExibicao(dataString) {
        return dateTime.formatDateTime(dataString)
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
            
            // Garantir que todas as compras tenham valor_total
            this.dadosCompras = this.dadosCompras.map(compra => {
                if (!compra.valor_total) {
                    compra.valor_total = (compra.quantidade || 0) * (parseFloat(compra.valor_compra) || 0)
                }
                return compra
            })
            
            this.renderizarCompras(this.dadosCompras)
            this.preencherFiltroDatas('compras')
        } catch (err) {
            console.error('Erro ao carregar compras:', err)
        }
    }
    
    async carregarVendas() {
        try {
            // Buscar todas as vendas
            const { data: vendas, error: vendasError } = await supabaseService.getVendas()
            
            if (vendasError) {
                console.error('Erro ao carregar vendas:', vendasError)
                return
            }
            
            // Buscar todos os itens de venda
            const { data: itens, error: itensError } = await supabaseService.getAllItensVenda()
            
            if (itensError) {
                console.error('Erro ao carregar itens de venda:', itensError)
                return
            }
            
            console.log('Vendas carregadas:', vendas?.length || 0)
            console.log('Itens carregados:', itens?.length || 0)
            
            // Combinar itens com informações da venda
            const itensComVenda = []
            
            for (const item of (itens || [])) {
                const venda = (vendas || []).find(v => v.id === item.venda_id)
                
                if (venda) {
                    let fornecedor = item.fornecedor
                    let categoria = item.categoria
                    
                    if (!fornecedor || !categoria) {
                        const produto = await this.buscarProdutoPorId(item.produto_id)
                        fornecedor = fornecedor || produto?.fornecedor || venda.fornecedor || '-'
                        categoria = categoria || produto?.categoria || venda.categoria || '-'
                    }
                    
                    const formaPagamento = item.forma_pagamento || venda.forma_pagamento || '-'
                    
                    itensComVenda.push({
                        ...item,
                        numero_venda: venda.numero_venda,
                        data_venda: venda.data_venda,  // Passar a data original
                        fornecedor: fornecedor,
                        categoria: categoria,
                        forma_pagamento: formaPagamento
                    })
                }
            }
            
            this.dadosVendas = itensComVenda
            console.log('Itens de venda combinados:', this.dadosVendas.length)
            console.log('Primeiro item - data original:', this.dadosVendas[0]?.data_venda)
            console.log('Primeiro item - data formatada:', dateTime.formatDateTime(this.dadosVendas[0]?.data_venda))
            
            this.renderizarVendas(this.dadosVendas)
            this.preencherFiltroDatas('vendas')
            
        } catch (err) {
            console.error('Erro ao carregar vendas:', err)
        }
    }

    // Adicionar método para buscar produto por ID
    async buscarProdutoPorId(produtoId) {
        try {
            const { data, error } = await supabaseService.getProdutoById(produtoId)
            if (error) {
                console.error('Erro ao buscar produto:', error)
                return null
            }
            return data
        } catch (err) {
            console.error('Erro ao buscar produto:', err)
            return null
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
        let totalValorTotal = 0
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        // Ordenar por data (mais recente primeiro)
        const dadosOrdenados = [...dados].sort((a, b) => 
            new Date(b.data_compra) - new Date(a.data_compra)
        )
        
        dadosOrdenados.forEach(compra => {
            const tr = document.createElement('tr')
            
            // Calcular valor total se não existir
            const quantidade = compra.quantidade || 0
            const valorUnitario = parseFloat(compra.valor_compra) || 0
            const valorTotal = compra.valor_total || (quantidade * valorUnitario)
            
            tr.innerHTML = `
                <td>${this.formatarDataExibicao(compra.data_compra)}</td>
                <td>${compra.codigo_produto || '-'}</td>
                <td>${compra.descricao_produto || '-'}</td>
                <td>${compra.fornecedor || '-'}</td>
                <td>${compra.categoria || '-'}</td>
                <td>${quantidade}</td>
                <td>${formatters.formatCurrency(valorUnitario)}</td>
                <td>${formatters.formatCurrency(valorTotal)}</td>
            `
            tbody.appendChild(tr)
            
            totalQuantidade += quantidade
            totalValorTotal += valorTotal
        })
        
        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="5"><strong>TOTAL</strong></td>
                    <td><strong>${totalQuantidade}</strong></td>
                    <td>-</td>
                    <td><strong>${formatters.formatCurrency(totalValorTotal)}</strong></td>
                </tr>
            `
        }
    }
    
    renderizarVendas(dados) {
        const tbody = document.getElementById('tbodyRelatorioVendas')
        const tfoot = document.getElementById('tfootRelatorioVendas')
        
        if (!tbody) {
            console.error('tbody não encontrado')
            return
        }
        
        tbody.innerHTML = ''
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        // Agrupar itens por data
        const itensAgrupados = this.agruparItensPorData(dados)
        let totalGeralQuantidade = 0
        let totalGeralVendas = 0
        let totalGeralCusto = 0
        let totalGeralLucro = 0
        
        // Ordenar datas em ordem decrescente
        const datasOrdenadas = Object.keys(itensAgrupados).sort().reverse()
        
        datasOrdenadas.forEach(data => {
            const itens = itensAgrupados[data]
            
            let subtotalQuantidade = 0
            let subtotalVendas = 0
            let subtotalCusto = 0
            let subtotalLucro = 0
            
            itens.forEach(item => {
                const lucro = this.calcularLucroItem(item)
                const percentualLucro = this.calcularPercentualLucroItem(item)
                const custoTotal = (parseFloat(item.valor_compra) || 0) * (item.quantidade || 0)
                
                const fornecedor = item.fornecedor || '-'
                const categoria = item.categoria || '-'
                const formaPagamento = item.forma_pagamento || '-'
                
                let formaPagamentoClass = ''
                if (formaPagamento === 'Pendente') {
                    formaPagamentoClass = 'badge badge-warning'
                } else if (formaPagamento === 'PIX' || formaPagamento === 'Dinheiro') {
                    formaPagamentoClass = 'badge badge-success'
                } else if (formaPagamento.includes('Cartão')) {
                    formaPagamentoClass = 'badge badge-info'
                }
                
                const dataHoraFormatada = dateTime.formatDateTime(item.data_venda)
                
                const tr = document.createElement('tr')
                tr.innerHTML = `
                    <td>${dataHoraFormatada}</td>
                    <td>${item.numero_venda || '-'}</td>
                    <td>${item.descricao_produto || '-'}</td>
                    <td>${fornecedor}</td>
                    <td>${categoria}</td>
                    <td>${item.quantidade || 0}</td>
                    <td>${formatters.formatCurrency(item.valor_unitario)}</td>
                    <td>${formatters.formatCurrency(item.desconto || 0)}</td>
                    <td>${formatters.formatCurrency(item.valor_total)}</td>
                    <td><span class="${formaPagamentoClass}">${formaPagamento}</span></td>
                    <td>${percentualLucro.toFixed(2)}%</td>
                    <td>${formatters.formatCurrency(lucro)}</td>
                `
                tbody.appendChild(tr)
                
                subtotalQuantidade += item.quantidade || 0
                subtotalVendas += parseFloat(item.valor_total) || 0
                subtotalCusto += custoTotal
                subtotalLucro += lucro
                
                totalGeralQuantidade += item.quantidade || 0
                totalGeralVendas += parseFloat(item.valor_total) || 0
                totalGeralCusto += custoTotal
                totalGeralLucro += lucro
            })
            
            const percentualMedioLucro = subtotalCusto > 0 ? (subtotalLucro / subtotalCusto) * 100 : 0
            
            // Linha de subtotal - CORRIGIDA com colspan correto
            const trSubtotal = document.createElement('tr')
            trSubtotal.style.backgroundColor = '#f8f9fa'
            trSubtotal.style.fontWeight = 'bold'
            trSubtotal.style.borderTop = '2px solid #dee2e6'
            trSubtotal.innerHTML = `
                <td colspan="5" style="text-align: right;">
                    <strong>Subtotal ${this.formatarDataExibicao(data)}</strong>
                </td>
                <td><strong>${subtotalQuantidade}</strong></td>
                <td colspan="2"></td>
                <td><strong>${formatters.formatCurrency(subtotalVendas)}</strong></td>
                <td></td>
                <td><strong>${percentualMedioLucro.toFixed(2)}%</strong></td>
                <td><strong>${formatters.formatCurrency(subtotalLucro)}</strong></td>
            `
            tbody.appendChild(trSubtotal)
        })
        
        const percentualMedioGeral = totalGeralCusto > 0 ? (totalGeralLucro / totalGeralCusto) * 100 : 0
        
        // Linha de total geral - CORRIGIDA com colspan correto
        if (tfoot) {
            tfoot.innerHTML = `
                <tr style="background-color: #e9ecef; font-weight: bold; border-top: 3px solid #8B4513;">
                    <td colspan="5" style="text-align: right;"><strong>TOTAL GERAL</strong></td>
                    <td><strong>${totalGeralQuantidade}</strong></td>
                    <td colspan="2"></td>
                    <td><strong>${formatters.formatCurrency(totalGeralVendas)}</strong></td>
                    <td></td>
                    <td><strong>${percentualMedioGeral.toFixed(2)}%</strong></td>
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
        let totalItens = 0
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Nenhum dado encontrado</td></tr>'
            if (tfoot) tfoot.innerHTML = ''
            return
        }
        
        // Ordenar por data (mais recente primeiro)
        const dadosOrdenados = [...dados].sort((a, b) => 
            new Date(b.data_auditoria) - new Date(a.data_auditoria)
        )
        
        dadosOrdenados.forEach(auditoria => {
            const tr = document.createElement('tr')
            const statusClass = auditoria.status === 'OK' ? 'status-ok' : 'status-nao-ok'
            const diferenca = (auditoria.quantidade_fisica || 0) - (auditoria.quantidade_sistema || 0)
            const diferencaFormatada = diferenca > 0 ? `+${diferenca}` : diferenca
            
            tr.innerHTML = `
                <td>${this.formatarDataHoraExibicao(auditoria.data_auditoria)}</td>
                <td>${auditoria.codigo_produto || '-'}</td>
                <td>${auditoria.descricao_produto || '-'}</td>
                <td>${auditoria.categoria || '-'}</td>
                <td>${auditoria.quantidade_fisica || 0}</td>
                <td>${auditoria.quantidade_sistema || 0}</td>
                <td style="color: ${diferenca === 0 ? 'green' : (diferenca > 0 ? 'blue' : 'red')}; font-weight: 500;">
                    ${diferencaFormatada}
                </td>
                <td><span class="status-badge ${statusClass}">${auditoria.status || '-'}</span></td>
            `
            tbody.appendChild(tr)
            
            totalItens++
            if (auditoria.status === 'OK') {
                totalOK++
            } else {
                totalNaoOK++
            }
        })
        
        if (tfoot) {
            tfoot.innerHTML = `
                <tr>
                    <td colspan="4"><strong>RESUMO</strong></td>
                    <td><strong>Total de itens: ${totalItens}</strong></td>
                    <td colspan="2"></td>
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
    
    agruparItensPorData(itens) {
        const agrupado = {}
        
        itens.forEach(item => {
            // Usar dateTime.extrairDataLocal para consistência
            const data = dateTime.extrairDataLocal(item.data_venda)
            
            if (data) {
                if (!agrupado[data]) {
                    agrupado[data] = []
                }
                agrupado[data].push(item)
            }
        })
        
        return agrupado
    }
    
    calcularLucro(venda) {
        return (parseFloat(venda.valor_total) || 0) * 0.3
    }
    
    calcularPercentualLucro(venda) {
        return 30
    }
    
    calcularLucroItem(item) {
        const valorTotal = parseFloat(item.valor_total) || 0
        const desconto = parseFloat(item.desconto) || 0
        const valorCompraUnitario = parseFloat(item.valor_compra) || 0
        const quantidade = item.quantidade || 0
        
        // Custo total = valor de compra unitário * quantidade
        const custoTotal = valorCompraUnitario * quantidade
        
        // Lucro = Valor Total - Desconto - Custo Total
        const lucro = valorTotal - desconto - custoTotal
        
        return Math.max(0, lucro)
    }
    
    calcularPercentualLucroItem(item) {
        const valorTotal = parseFloat(item.valor_total) || 0
        const desconto = parseFloat(item.desconto) || 0
        const valorCompraUnitario = parseFloat(item.valor_compra) || 0
        const quantidade = item.quantidade || 0
        
        const valorLiquido = valorTotal - desconto
        const custoTotal = valorCompraUnitario * quantidade
        
        if (custoTotal <= 0) return 0
        
        // Percentual de lucro = (Valor Líquido - Custo) / Custo * 100
        const percentual = ((valorLiquido - custoTotal) / custoTotal) * 100
        
        return Math.max(0, percentual)
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
        
        if (dados.length === 0) {
            const option = document.createElement('option')
            option.value = ''
            option.textContent = 'Nenhum dado disponível'
            filtroData.appendChild(option)
            return
        }
        
        if (tipoFiltro === 'detalhado') {
            const campoData = tipo === 'compras' ? 'data_compra' : 
                            tipo === 'vendas' ? 'data_venda' : 'data_auditoria'
            
            const datasUnicas = [...new Set(dados.map(d => {
                return this.extrairDataLocal(d[campoData])
            }))].filter(d => d !== null).sort().reverse()
            
            console.log('Datas únicas encontradas:', datasUnicas)
            
            if (datasUnicas.length === 0) {
                const option = document.createElement('option')
                option.value = ''
                option.textContent = 'Nenhuma data disponível'
                filtroData.appendChild(option)
                return
            }
            
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
            
            if (mesesUnicos.length === 0) {
                const option = document.createElement('option')
                option.value = ''
                option.textContent = 'Nenhum mês disponível'
                filtroData.appendChild(option)
                return
            }
            
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
        const tabela = document.getElementById('tabelaRelatorioAuditoria')
    
        if (!tabela) {
            console.error('Tabela não encontrada')
            return
        }
        
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
                        <h1>Verbo Café - Relatório de Auditoria</h1>
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