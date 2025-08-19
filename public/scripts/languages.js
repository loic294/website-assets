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

        // Add CSS for the options (styles are now in CSS file)
        this.addLanguageOptionStyles();
    }

    addLanguageOptionStyles() {
        // CSS styles are now handled in the external CSS file
        // This method is kept for backwards compatibility
        return true;
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