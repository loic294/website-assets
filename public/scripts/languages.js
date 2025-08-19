// Squarespace Language Picker Enhancement
// Works with existing Squarespace multilingual language picker
class SquarespaceLanguagePicker {
    constructor() {
        this.currentLanguage = this.detectCurrentLanguage();
        this.supportedLanguages = {
            'en': { name: 'English', domain: this.getBaseDomain() },
            'fr': { name: 'Français', domain: 'fr.' + this.getBaseDomain() }
        };
        this.init();
    }

    init() {
        this.enhanceExistingPicker();
        this.bindEvents();
    }

    getBaseDomain() {
        const hostname = window.location.hostname;
        // Remove 'fr.' subdomain if present to get base domain
        return hostname.replace(/^fr\./, '');
    }

    detectCurrentLanguage() {
        const hostname = window.location.hostname;
        // Check if we're on the French subdomain
        if (hostname.startsWith('fr.')) {
            return 'fr';
        }
        return 'en';
    }

    enhanceExistingPicker() {
        // Find the existing Squarespace language picker
        const languagePicker = document.querySelector('#multilingual-language-picker-desktop');
        if (!languagePicker) {
            console.log('Squarespace language picker not found, will retry...');
            return false;
        }

        // Update the current language display
        this.updateCurrentLanguageDisplay();
        
        // Populate the dropdown content
        this.populateLanguageOptions();
        
        return true;
    }

    updateCurrentLanguageDisplay() {
        const currentLanguageName = document.querySelector('.current-language-name');
        if (currentLanguageName) {
            currentLanguageName.textContent = this.supportedLanguages[this.currentLanguage].name;
        }
    }

    populateLanguageOptions() {
        const languagePickerContent = document.querySelector('#language-picker-menu');
        if (!languagePickerContent) return;

        // Clear existing content
        languagePickerContent.innerHTML = '';

        // Create language options
        Object.entries(this.supportedLanguages).forEach(([code, lang]) => {
            const option = document.createElement('div');
            option.className = `language-option ${code === this.currentLanguage ? 'current' : ''}`;
            option.setAttribute('data-lang', code);
            option.setAttribute('role', 'option');
            option.setAttribute('tabindex', code === this.currentLanguage ? '-1' : '0');
            
            option.innerHTML = `
                <span class="language-option-name">${lang.name}</span>
            `;
            
            // Add click handler for language switching
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.changeLanguage(code);
            });
            
            // Add keyboard support
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.changeLanguage(code);
                }
            });

            languagePickerContent.appendChild(option);
        });

        // Add CSS for the options
        this.addLanguageOptionStyles();
    }

    addLanguageOptionStyles() {
        // Check if styles already added
        if (document.querySelector('#squarespace-language-enhancement-styles')) return;

        const style = document.createElement('style');
        style.id = 'squarespace-language-enhancement-styles';
        style.textContent = `
            #language-picker-menu {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                min-width: 120px;
                padding: 8px 0;
                position: absolute;
                top: 100%;
                right: 0;
                z-index: 9999;
                margin-top: 4px;
            }
            
            .language-option {
                padding: 8px 16px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .language-option:hover {
                background-color: #f5f5f5;
            }
            
            .language-option.current {
                background-color: #e3f2fd;
                color: #1976d2;
                font-weight: 500;
                cursor: default;
            }
            
            .language-option.current:hover {
                background-color: #e3f2fd;
            }
            
            .language-option-name {
                display: block;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                #language-picker-menu {
                    background: #2a2a2a;
                    border-color: #444;
                    color: white;
                }
                
                .language-option:hover {
                    background-color: #3a3a3a;
                }
                
                .language-option.current {
                    background-color: #1565c0;
                    color: white;
                }
                
                .language-option.current:hover {
                    background-color: #1565c0;
                }
            }
            
            /* Hide dropdown by default */
            .language-picker:not(.active) #language-picker-menu {
                display: none;
            }
            
            .language-picker.active #language-picker-menu {
                display: block;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // Find the existing language picker toggle
        const languagePickerToggle = document.querySelector('#multilingual-language-picker-desktop');
        
        if (languagePickerToggle) {
            // Handle dropdown toggle
            languagePickerToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });

            // Handle keyboard navigation
            languagePickerToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleDropdown();
                }
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const languagePicker = document.querySelector('#multilingual-language-picker-desktop');
            if (languagePicker && !languagePicker.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        const languagePicker = document.querySelector('#multilingual-language-picker-desktop');
        if (!languagePicker) return;

        const isExpanded = languagePicker.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        const languagePicker = document.querySelector('#multilingual-language-picker-desktop');
        if (!languagePicker) return;

        languagePicker.setAttribute('aria-expanded', 'true');
        languagePicker.classList.add('active');
    }

    closeDropdown() {
        const languagePicker = document.querySelector('#multilingual-language-picker-desktop');
        if (!languagePicker) return;

        languagePicker.setAttribute('aria-expanded', 'false');
        languagePicker.classList.remove('active');
    }

    changeLanguage(newLang) {
        if (newLang === this.currentLanguage) {
            this.closeDropdown();
            return;
        }
        
        const langConfig = this.supportedLanguages[newLang];
        if (!langConfig) return;

        // Trigger custom event before redirect
        const event = new CustomEvent('languageChanged', {
            detail: { 
                newLang, 
                prevLang: this.currentLanguage,
                redirectUrl: `https://${langConfig.domain}${window.location.pathname}${window.location.search}`
            }
        });
        document.dispatchEvent(event);
        
        console.log(`Redirecting to ${newLang} version: ${langConfig.domain}`);
        
        // Redirect to the appropriate domain
        const protocol = window.location.protocol;
        const pathname = window.location.pathname;
        const search = window.location.search;
        const newUrl = `${protocol}//${langConfig.domain}${pathname}${search}`;
        
        window.location.href = newUrl;
    }

    // Public method to get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Public method to get language name
    getLanguageName(langCode) {
        return this.supportedLanguages[langCode]?.name || langCode;
    }

    // Method to manually reinitialize if DOM changes (useful for Squarespace)
    reinitialize() {
        this.init();
    }
}

// Initialize the language picker enhancement when DOM is ready
// Also provide retry mechanism for Squarespace dynamic content loading
function initializeLanguagePicker() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createLanguagePicker);
    } else {
        createLanguagePicker();
    }
    
    // Retry mechanism for Squarespace sites that load content dynamically
    let retries = 0;
    const maxRetries = 10;
    
    function retryInit() {
        if (retries < maxRetries && !document.querySelector('#squarespace-language-enhancement-styles')) {
            setTimeout(() => {
                createLanguagePicker();
                retries++;
                retryInit();
            }, 1000);
        }
    }
    
    retryInit();
}

function createLanguagePicker() {
    try {
        // Check if Squarespace language picker exists
        const existingPicker = document.querySelector('#multilingual-language-picker-desktop');
        if (!existingPicker) {
            console.log('Squarespace language picker not found, will retry...');
            return;
        }

        window.languagePicker = new SquarespaceLanguagePicker();
        
        // Example of listening to language changes
        document.addEventListener('languageChanged', function(event) {
            const { newLang, prevLang, redirectUrl } = event.detail;
            console.log(`The language on the page just changed to (code): ${newLang}`);
            console.log(`Redirecting to: ${redirectUrl}`);
        });
        
        console.log('Squarespace language picker enhanced successfully');
    } catch (error) {
        console.error('Error enhancing language picker:', error);
    }
}

// Start initialization
initializeLanguagePicker();