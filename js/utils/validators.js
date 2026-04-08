// js/utils/validators.js

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
}

export function validatePhone(phone) {
    const re = /^\(?[1-9]{2}\)? ?(?:[2-8]|9[1-9])[0-9]{3}\-?[0-9]{4}$/
    return re.test(phone.replace(/\D/g, ''))
}

export function validateCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '')
    
    if (cpf.length !== 11) return false
    
    if (/^(\d)\1{10}$/.test(cpf)) return false
    
    let sum = 0
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i)
    }
    let rev = 11 - (sum % 11)
    if (rev === 10 || rev === 11) rev = 0
    if (rev !== parseInt(cpf.charAt(9))) return false
    
    sum = 0
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i)
    }
    rev = 11 - (sum % 11)
    if (rev === 10 || rev === 11) rev = 0
    if (rev !== parseInt(cpf.charAt(10))) return false
    
    return true
}

export function validateCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '')
    
    if (cnpj.length !== 14) return false
    
    if (/^(\d)\1{13}$/.test(cnpj)) return false
    
    let size = cnpj.length - 2
    let numbers = cnpj.substring(0, size)
    let digits = cnpj.substring(size)
    let sum = 0
    let pos = size - 7
    
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--
        if (pos < 2) pos = 9
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result != digits.charAt(0)) return false
    
    size = size + 1
    numbers = cnpj.substring(0, size)
    sum = 0
    pos = size - 7
    
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--
        if (pos < 2) pos = 9
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result != digits.charAt(1)) return false
    
    return true
}

export function validateNumber(input, min = null, max = null) {
    let value = parseFloat(input.value)
    
    if (isNaN(value)) {
        input.value = min || 0
        return false
    }
    
    if (min !== null && value < min) {
        input.value = min
        return false
    }
    
    if (max !== null && value > max) {
        input.value = max
        return false
    }
    
    return true
}

export function validateCurrency(input) {
    if (!input || !input.value) {
        if (input) input.value = '0,00'
        return false
    }
    
    let value = input.value
    
    // Se estiver vazio, define como 0
    if (!value || value.trim() === '') {
        input.value = '0,00'
        return false
    }
    
    // Remove R$, espaços e caracteres não numéricos (exceto vírgula e ponto)
    let cleanValue = value
        .replace(/R\$/g, '')
        .replace(/\s/g, '')
        .replace(/[^\d,.-]/g, '')
    
    // Se não sobrou nada, retorna 0
    if (!cleanValue) {
        input.value = '0,00'
        return false
    }
    
    // Substitui vírgula por ponto para cálculo
    let numericValue = cleanValue.replace(/\./g, '').replace(',', '.')
    
    // Converte para número
    let numValue = parseFloat(numericValue)
    
    // Se não for um número válido ou for negativo
    if (isNaN(numValue) || numValue < 0) {
        input.value = '0,00'
        return false
    }
    
    // Formata para padrão brasileiro com 2 casas decimais
    input.value = formatCurrencyValue(numValue)
    return true
}

export function formatCurrencyInput(input) {
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

export function getCurrencyValue(input) {
    if (!input || !input.value) return 0
    
    // Remove R$, pontos (separadores de milhar) e substitui vírgula por ponto
    const value = input.value
        .replace(/R\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .trim()
    
    const numValue = parseFloat(value)
    return isNaN(numValue) ? 0 : numValue
}

export function formatCurrencyValue(value) {
    if (value === null || value === undefined || isNaN(value)) {
        return '0,00'
    }
    
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

export function validateDate(dateString) {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date)
}

export function validateRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== ''
}

export function validateLength(value, min, max) {
    const length = value.toString().length
    return length >= min && length <= max
}

export function validatePassword(password) {
    // Mínimo 8 caracteres, pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    return re.test(password)
}

export function formatCPF(cpf) {
    if (!cpf) return ''
    
    cpf = cpf.replace(/\D/g, '')
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2')
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2')
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    return cpf
}

export function formatCNPJ(cnpj) {
    if (!cnpj) return ''
    
    cnpj = cnpj.replace(/\D/g, '')
    cnpj = cnpj.replace(/^(\d{2})(\d)/, '$1.$2')
    cnpj = cnpj.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    cnpj = cnpj.replace(/\.(\d{3})(\d)/, '.$1/$2')
    cnpj = cnpj.replace(/(\d{4})(\d)/, '$1-$2')
    return cnpj
}

export function formatPhone(phone) {
    if (!phone) return ''
    
    phone = phone.replace(/\D/g, '')
    
    if (phone.length === 11) {
        phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (phone.length === 10) {
        phone = phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    
    return phone
}

export function formatCEP(cep) {
    if (!cep) return ''
    
    cep = cep.replace(/\D/g, '')
    cep = cep.replace(/(\d{5})(\d)/, '$1-$2')
    return cep
}

export function maskInput(input, type) {
    if (!input || !input.value) return
    
    let value = input.value
    
    switch(type) {
        case 'cpf':
            input.value = formatCPF(value)
            break
        case 'cnpj':
            input.value = formatCNPJ(value)
            break
        case 'phone':
            input.value = formatPhone(value)
            break
        case 'cep':
            input.value = formatCEP(value)
            break
        case 'currency':
            formatCurrencyInput(input)
            break
    }
}

export function showValidationError(input, message) {
    if (!input) return
    
    const formGroup = input.closest('.form-group')
    if (!formGroup) return
    
    // Remover erro existente
    const existingError = formGroup.querySelector('.error-message')
    if (existingError) {
        existingError.remove()
    }
    
    // Adicionar novo erro
    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message'
    errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 12px;
        margin-top: 5px;
        animation: fadeIn 0.3s ease;
    `
    errorDiv.textContent = message
    
    formGroup.appendChild(errorDiv)
    input.classList.add('is-invalid')
    
    // Adicionar estilo de erro se não existir
    if (!document.querySelector('#validation-styles')) {
        const style = document.createElement('style')
        style.id = 'validation-styles'
        style.textContent = `
            .is-invalid {
                border-color: #dc3545 !important;
            }
            .is-invalid:focus {
                box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `
        document.head.appendChild(style)
    }
}

export function clearValidationError(input) {
    if (!input) return
    
    const formGroup = input.closest('.form-group')
    if (!formGroup) return
    
    const existingError = formGroup.querySelector('.error-message')
    if (existingError) {
        existingError.remove()
    }
    
    input.classList.remove('is-invalid')
}

export function validateForm(formData, rules) {
    const errors = {}
    
    for (const [field, value] of Object.entries(formData)) {
        const fieldRules = rules[field]
        
        if (!fieldRules) continue
        
        if (fieldRules.required && !validateRequired(value)) {
            errors[field] = fieldRules.requiredMessage || 'Este campo é obrigatório'
            continue
        }
        
        if (value && fieldRules.email && !validateEmail(value)) {
            errors[field] = 'E-mail inválido'
            continue
        }
        
        if (value && fieldRules.cpf && !validateCPF(value)) {
            errors[field] = 'CPF inválido'
            continue
        }
        
        if (value && fieldRules.cnpj && !validateCNPJ(value)) {
            errors[field] = 'CNPJ inválido'
            continue
        }
        
        if (value && fieldRules.phone && !validatePhone(value)) {
            errors[field] = 'Telefone inválido'
            continue
        }
        
        if (value && fieldRules.min && value.length < fieldRules.min) {
            errors[field] = `Mínimo de ${fieldRules.min} caracteres`
            continue
        }
        
        if (value && fieldRules.max && value.length > fieldRules.max) {
            errors[field] = `Máximo de ${fieldRules.max} caracteres`
            continue
        }
        
        if (value && fieldRules.custom && typeof fieldRules.custom === 'function') {
            const customError = fieldRules.custom(value)
            if (customError) {
                errors[field] = customError
                continue
            }
        }
    }
    
    return errors
}

// Funções adicionais para validação de campos monetários
export function setupCurrencyField(input, options = {}) {
    if (!input) return
    
    const config = {
        min: options.min || 0,
        max: options.max || null,
        allowNegative: options.allowNegative || false,
        ...options
    }
    
    // Formatação durante digitação
    input.addEventListener('input', (e) => {
        formatCurrencyInput(e.target)
    })
    
    // Validação ao perder o foco
    input.addEventListener('blur', (e) => {
        const value = getCurrencyValue(e.target)
        
        if (value < config.min && !config.allowNegative) {
            e.target.value = formatCurrencyValue(config.min)
            showValidationError(e.target, `Valor mínimo: ${formatCurrencyValue(config.min)}`)
        } else if (config.max && value > config.max) {
            e.target.value = formatCurrencyValue(config.max)
            showValidationError(e.target, `Valor máximo: ${formatCurrencyValue(config.max)}`)
        } else {
            clearValidationError(e.target)
            e.target.value = formatCurrencyValue(value)
        }
    })
    
    // Validação ao ganhar foco
    input.addEventListener('focus', (e) => {
        clearValidationError(e.target)
        const value = getCurrencyValue(e.target)
        if (value === 0) {
            e.target.value = ''
        }
    })
    
    // Formatar valor inicial se existir
    if (input.value) {
        const value = parseFloat(input.value) || 0
        input.value = formatCurrencyValue(value)
    }
}

// Função para validar campos em tempo real
export function setupRealTimeValidation(form, rules) {
    if (!form) return
    
    const inputs = form.querySelectorAll('input, select, textarea')
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            const fieldName = input.name || input.id
            const rule = rules[fieldName]
            
            if (rule) {
                const value = input.value
                
                if (rule.required && !validateRequired(value)) {
                    showValidationError(input, rule.requiredMessage || 'Este campo é obrigatório')
                } else if (rule.email && !validateEmail(value)) {
                    showValidationError(input, 'E-mail inválido')
                } else if (rule.min && value.length < rule.min) {
                    showValidationError(input, `Mínimo de ${rule.min} caracteres`)
                } else {
                    clearValidationError(input)
                }
            }
        })
        
        input.addEventListener('focus', () => {
            clearValidationError(input)
        })
    })
}

// Função para formatar automaticamente campos de moeda em toda a aplicação
export function autoFormatCurrencyFields() {
    const currencyFields = document.querySelectorAll('input[data-type="currency"], input[inputmode="decimal"]')
    
    currencyFields.forEach(field => {
        if (!field.hasAttribute('data-currency-initialized')) {
            setupCurrencyField(field)
            field.setAttribute('data-currency-initialized', 'true')
        }
    })
}

// Executar auto formatação quando o DOM estiver pronto
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(autoFormatCurrencyFields, 100)
    })
}

// Observer para campos adicionados dinamicamente
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                setTimeout(autoFormatCurrencyFields, 100)
            }
        })
    })
    
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        })
    })
}