// js/app.js
import { supabaseService } from './supabase-config.js'
import * as formatters from './utils/formatters.js'
import * as validators from './utils/validators.js'

// Módulos da aplicação
import { comprasModule } from './modules/compras.js'
import { produtosModule } from './modules/produtos.js'
import { vendasModule } from './modules/vendas.js'
import { auditoriaModule } from './modules/auditoria.js'
import { relatoriosModule } from './modules/relatorios.js'

class App {
    constructor() {
        this.currentPage = 'compras'
        this.modules = {
            compras: comprasModule,
            produtos: produtosModule,
            vendas: vendasModule,
            auditoria: auditoriaModule,
            relatorios: relatoriosModule
        }
        this.init()
    }
    
    async init() {
        this.setupNavigation()
        this.setupSidebar()
        this.loadPage(this.currentPage)
        this.setupResponsiveMenu()
    }
    
    setupNavigation() {
        // Menu principal - links com data-page
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault()
                const page = link.dataset.page
                this.loadPage(page)
                this.setActiveNavLink(link)
            })
        })
        
        // Links do submenu
        document.querySelectorAll('.submenu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault()
                const page = link.dataset.page
                if (page) {
                    this.loadPage(page)
                    
                    // Ativar o item do submenu e seu pai
                    document.querySelectorAll('.submenu a').forEach(l => l.classList.remove('active'))
                    link.classList.add('active')
                    
                    // Manter o menu pai aberto e ativo
                    const parentItem = link.closest('.has-submenu')
                    if (parentItem) {
                        parentItem.classList.add('open')
                        const parentLink = parentItem.querySelector('.nav-link')
                        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
                        parentLink.classList.add('active')
                    }
                    
                    // Fechar sidebar em mobile
                    if (window.innerWidth <= 768) {
                        document.getElementById('sidebar').classList.remove('mobile-open')
                    }
                }
            })
        })
        
        // Submenu toggle
        document.querySelectorAll('.has-submenu > .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault()
                const parent = link.parentElement
                
                // Fechar outros submenus
                document.querySelectorAll('.has-submenu').forEach(item => {
                    if (item !== parent) {
                        item.classList.remove('open')
                    }
                })
                
                // Toggle do submenu atual
                parent.classList.toggle('open')
            })
        })
    }
    
    setupSidebar() {
        const toggle = document.getElementById('sidebarToggle')
        const sidebar = document.getElementById('sidebar')
        const mainContent = document.querySelector('.main-content')
        
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed')
            mainContent.classList.toggle('expanded')
        })
    }
    
    async loadPage(page) {
        this.currentPage = page
        const container = document.getElementById('pagesContainer')
        
        // Mapear templates para cada página
        const templateMap = {
            'compras': 'template-compras',
            'produtos': 'template-produtos',
            'vendas': 'template-vendas',
            'auditoria': 'template-auditoria',
            'relatorio-compras': 'template-relatorio-compras',
            'relatorio-vendas': 'template-relatorio-vendas',
            'relatorio-auditoria': 'template-relatorio-auditoria'
        }
        
        const templateId = templateMap[page]
        
        if (!templateId) {
            console.error(`Template não encontrado para: ${page}`)
            return
        }
        
        const template = document.getElementById(templateId)
        
        if (template) {
            container.innerHTML = ''
            container.appendChild(template.content.cloneNode(true))
            
            // Atualiza título
            const titles = {
                'compras': 'Compras',
                'produtos': 'Cadastro de Produtos',
                'vendas': 'Vendas',
                'auditoria': 'Auditoria de Estoque',
                'relatorio-compras': 'Relatório de Compras',
                'relatorio-vendas': 'Relatório de Vendas',
                'relatorio-auditoria': 'Relatório de Auditoria'
            }
            
            document.getElementById('pageTitle').textContent = titles[page] || page
            
            // Inicializa o módulo correspondente
            await this.initModule(page)
        } else {
            console.error(`Template não encontrado: ${templateId}`)
        }
    }
    
    async initModule(page) {
        const moduleMap = {
            'compras': () => comprasModule.init(),
            'produtos': () => produtosModule.init(),
            'vendas': () => vendasModule.init(),
            'auditoria': () => auditoriaModule.init(),
            'relatorio-compras': () => relatoriosModule.initCompras(),
            'relatorio-vendas': () => relatoriosModule.initVendas(),
            'relatorio-auditoria': () => relatoriosModule.initAuditoria()
        }
        
        if (moduleMap[page]) {
            await moduleMap[page]()
        }
    }
    
    setActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active')
        })
        activeLink.classList.add('active')
        
        // Fecha sidebar em mobile após navegação
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('mobile-open')
        }
    }
    
    setupResponsiveMenu() {
        // Adiciona botão de menu mobile no header
        const header = document.querySelector('.main-header')
        const menuButton = document.createElement('button')
        menuButton.className = 'mobile-menu-btn'
        menuButton.innerHTML = '<i class="fas fa-bars"></i>'
        menuButton.style.cssText = `
            display: none;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 10px;
        `
        
        header.insertBefore(menuButton, header.firstChild)
        
        menuButton.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('mobile-open')
        })
        
        // Mostra/esconde botão mobile baseado no tamanho da tela
        const checkMobile = () => {
            menuButton.style.display = window.innerWidth <= 768 ? 'block' : 'none'
        }
        
        window.addEventListener('resize', checkMobile)
        checkMobile()
    }
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App()
    
    // Expõe os módulos globalmente para acesso nos eventos onclick
    window.comprasModule = comprasModule
    window.produtosModule = produtosModule
    window.vendasModule = vendasModule
    window.auditoriaModule = auditoriaModule
    window.relatoriosModule = relatoriosModule
})

export default App