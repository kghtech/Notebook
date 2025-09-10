// script.js

// Note Management System
class NotepadApp {
    constructor() {
        this.notes = {};
        this.currentNoteId = null;
        this.hasUnsavedChanges = false;
        this.nextNoteId = 1;
        
        // DOM elements
        this.initializeElements();
        this.bindEvents();
        this.loadNotesFromStorage();
        this.updateUI();
    }

    initializeElements() {
        // Main elements
        this.sidebar = document.getElementById('sidebar');
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.editorContainer = document.getElementById('editor-container');
        this.notesList = document.getElementById('notes-list');
        
        // Editor elements
        this.noteTitleInput = document.getElementById('note-title');
        this.noteContentTextarea = document.getElementById('note-content');
        this.wordCountSpan = document.getElementById('word-count');
        this.charCountSpan = document.getElementById('char-count');
        this.lastSavedSpan = document.getElementById('last-saved');
        this.fontSizeSelect = document.getElementById('font-size');
        this.fontFamilySelect = document.getElementById('font-family');
        
        // Search
        this.searchInput = document.getElementById('search-input');
        
        // Buttons
        this.newNoteBtn = document.getElementById('new-note-btn');
        this.welcomeNewNoteBtn = document.getElementById('welcome-new-note');
        this.toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
        this.saveBtn = document.getElementById('save-btn');
        this.deleteBtn = document.getElementById('delete-btn');
        
        // Modals
        this.deleteModal = document.getElementById('delete-modal');
        this.unsavedChangesModal = document.getElementById('unsaved-changes-modal');
        this.confirmDeleteBtn = document.getElementById('confirm-delete');
        this.cancelDeleteBtn = document.getElementById('cancel-delete');
        this.saveAndContinueBtn = document.getElementById('save-and-continue');
        this.discardChangesBtn = document.getElementById('discard-changes');
        this.cancelActionBtn = document.getElementById('cancel-action');
    }

    bindEvents() {
        // New note buttons
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.welcomeNewNoteBtn.addEventListener('click', () => this.createNewNote());
        
        // Sidebar toggle
        this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        
        // Save and delete
        this.saveBtn.addEventListener('click', () => this.saveCurrentNote());
        this.deleteBtn.addEventListener('click', () => this.showDeleteModal());
        
        // Note content changes
        this.noteTitleInput.addEventListener('input', () => this.handleContentChange());
        this.noteContentTextarea.addEventListener('input', () => {
            this.handleContentChange();
            this.updateStats();
        });
        
        // Font controls
        this.fontSizeSelect.addEventListener('change', () => this.updateFontStyle());
        this.fontFamilySelect.addEventListener('change', () => this.updateFontStyle());
        
        // Search
        this.searchInput.addEventListener('input', () => this.handleSearch());
        
        // Modal events
        this.confirmDeleteBtn.addEventListener('click', () => this.deleteCurrentNote());
        this.cancelDeleteBtn.addEventListener('click', () => this.hideModal(this.deleteModal));
        this.saveAndContinueBtn.addEventListener('click', () => this.saveAndContinue());
        this.discardChangesBtn.addEventListener('click', () => this.discardChanges());
        this.cancelActionBtn.addEventListener('click', () => this.hideModal(this.unsavedChangesModal));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.hasUnsavedChanges && this.currentNoteId) {
                this.saveCurrentNote(true);
            }
        }, 30000);
        
        // Window beforeunload
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    // Note Management
    createNewNote() {
        if (this.hasUnsavedChanges) {
            this.pendingAction = () => this.createNewNote();
            this.showUnsavedChangesModal();
            return;
        }

        const noteId = `note_${this.nextNoteId++}`;
        const now = new Date();
        
        const newNote = {
            id: noteId,
            title: 'Untitled Note',
            content: '',
            dateCreated: now.toISOString(),
            dateModified: now.toISOString()
        };
        
        this.notes[noteId] = newNote;
        this.selectNote(noteId);
        this.saveNotesToStorage();
        this.updateUI();
        
        // Focus on title input
        setTimeout(() => this.noteTitleInput.focus(), 100);
    }

    selectNote(noteId) {
        if (this.hasUnsavedChanges && this.currentNoteId !== noteId) {
            this.pendingAction = () => this.selectNote(noteId);
            this.showUnsavedChangesModal();
            return;
        }
        this.currentNoteId = noteId;
        this.hasUnsavedChanges = false;
        
        if (this.notes[noteId]) {
            const note = this.notes[noteId];
            this.noteTitleInput.value = note.title;
            this.noteContentTextarea.value = note.content;
            this.lastSavedSpan.textContent = this.formatDate(note.dateModified);
            
            this.showEditor();
            this.updateStats();
            this.updateNotesList();
        }
    }

    saveCurrentNote(autoSave = false) {
        if (!this.currentNoteId) return;
        
        const note = this.notes[this.currentNoteId];
        if (!note) return;
        
        note.title = this.noteTitleInput.value.trim() || 'Untitled Note';
        note.content = this.noteContentTextarea.value;
        note.dateModified = new Date().toISOString();
        
        this.hasUnsavedChanges = false;
        this.lastSavedSpan.textContent = autoSave ? 
            `Auto-saved at ${this.formatTime(new Date())}` : 
            `Saved at ${this.formatTime(new Date())}`;
        
        this.saveNotesToStorage();
        this.updateNotesList();
        
        if (!autoSave) {
            this.showSaveSuccess();
        }
    }

    deleteCurrentNote() {
        if (!this.currentNoteId) return;
        
        delete this.notes[this.currentNoteId];
        this.currentNoteId = null;
        this.hasUnsavedChanges = false;
        
        this.saveNotesToStorage();
        this.hideModal(this.deleteModal);
        this.updateUI();
        
        // Show welcome screen if no notes left
        if (Object.keys(this.notes).length === 0) {
            this.showWelcomeScreen();
        }
    }

    // UI Updates
    updateUI() {
        this.updateNotesList();
        
        if (!this.currentNoteId || !this.notes[this.currentNoteId]) {
            this.showWelcomeScreen();
        } else {
            this.showEditor();
        }
    }

    updateNotesList() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const filteredNotes = Object.values(this.notes).filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)
        );
        
        // Sort by modification date (newest first)
        filteredNotes.sort((a, b) => new Date(b.dateModified) - new Date(a.dateModified));
        
        this.notesList.innerHTML = '';
        
        if (filteredNotes.length === 0) {
            if (searchTerm) {
                this.notesList.innerHTML = `
                    <div class="no-results">
                        <p>No notes found matching "${searchTerm}"</p>
                    </div>
                `;
            } else {
                this.notesList.innerHTML = `
                    <div class="no-notes">
                        <p>No notes yet. Create your first note!</p>
                    </div>
                `;
            }
            return;
        }
        
        filteredNotes.forEach(note => {
            const noteElement = this.createNoteElement(note);
            this.notesList.appendChild(noteElement);
        });
    }

    createNoteElement(note) {
        const noteElement = document.createElement('div');
        noteElement.className = `note-item ${note.id === this.currentNoteId ? 'active' : ''}`;
        
        const preview = note.content.substring(0, 100);
        const dateFormatted = this.formatDate(note.dateModified);
        
        noteElement.innerHTML = `
            <h4>${this.escapeHtml(note.title)}</h4>
            <p class="note-preview">${this.escapeHtml(preview)}${preview.length === 100 ? '...' : ''}</p>
            <div class="note-date">${dateFormatted}</div>
        `;
        
        noteElement.addEventListener('click', () => this.selectNote(note.id));
        
        return noteElement;
    }

    showEditor() {
        this.welcomeScreen.classList.add('hidden');
        this.editorContainer.classList.remove('hidden');
    }

    showWelcomeScreen() {
        this.welcomeScreen.classList.remove('hidden');
        this.editorContainer.classList.add('hidden');
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('hidden');
    }

    updateStats() {
        const content = this.noteContentTextarea.value;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        
        this.wordCountSpan.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        this.charCountSpan.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
    }

    updateFontStyle() {
        const fontSize = this.fontSizeSelect.value + 'px';
        const fontFamily = this.fontFamilySelect.value;
        
        this.noteContentTextarea.style.fontSize = fontSize;
        this.noteContentTextarea.style.fontFamily = fontFamily;
    }

    // Event Handlers
    handleContentChange() {
        this.hasUnsavedChanges = true;
        this.lastSavedSpan.textContent = 'Unsaved changes';
    }

    handleSearch() {
        this.updateNotesList();
    }

    handleKeyboardShortcuts(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (this.currentNoteId) {
                this.saveCurrentNote();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.createNewNote();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.searchInput.focus();
        }
        if (e.key === 'Escape') {
            this.hideAllModals();
        }
    }

    // Modal Management
    showDeleteModal() {
        if (!this.currentNoteId) return;
        this.showModal(this.deleteModal);
    }

    showUnsavedChangesModal() {
        this.showModal(this.unsavedChangesModal);
    }

    showModal(modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    hideAllModals() {
        this.hideModal(this.deleteModal);
        this.hideModal(this.unsavedChangesModal);
    }

    saveAndContinue() {
        this.saveCurrentNote();
        this.hideModal(this.unsavedChangesModal);
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
    }

    discardChanges() {
        this.hasUnsavedChanges = false;
        
        if (this.currentNoteId && this.notes[this.currentNoteId]) {
            const note = this.notes[this.currentNoteId];
            this.noteTitleInput.value = note.title;
            this.noteContentTextarea.value = note.content;
            this.lastSavedSpan.textContent = this.formatDate(note.dateModified);
        }
        
        this.hideModal(this.unsavedChangesModal);
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
    }

    // Storage Management using localStorage
    saveNotesToStorage() {
        const notesData = {
            notes: this.notes,
            nextNoteId: this.nextNoteId
        };
        localStorage.setItem('notepad-notes', JSON.stringify(notesData));
    }

    loadNotesFromStorage() {
        const stored = localStorage.getItem('notepad-notes');
        if (stored) {
            const data = JSON.parse(stored);
            this.notes = data.notes || {};
            this.nextNoteId = data.nextNoteId || 1;
        } else {
            this.createDemoNotes();
        }
    }

    createDemoNotes() {
        const demoNotes = [
            {
                title: 'Welcome to Notepad!',
                content: `Welcome to your personal notepad application!

Here are some features you can explore:

✏️ Create and edit notes with a rich text editor
🔍 Search through all your notes instantly
💾 Auto-save functionality keeps your work safe
🎨 Customize font size and family
📊 Real-time word and character count
⌨️ Keyboard shortcuts for quick actions

Keyboard Shortcuts:
• Ctrl/Cmd + S: Save current note
• Ctrl/Cmd + N: Create new note
• Ctrl/Cmd + F: Focus search
• Esc: Close modals

Your notes are automatically saved as you type, so you never have to worry about losing your work!

Start creating your own notes by clicking the "New Note" button above.`
            },
            {
                title: 'Shopping List',
                content: `🛒 Shopping List

Groceries:
- Milk
- Bread
- Eggs
- Cheese
- Apples
- Bananas

Household:
- Laundry detergent
- Paper towels
- Light bulbs

Remember to check the pantry before leaving!`
            },
            {
                title: 'Meeting Notes - Project Alpha',
                content: `📅 Meeting Notes - Project Alpha
Date: Today

Attendees:
- John Smith (Project Manager)
- Sarah Johnson (Developer)
- Mike Chen (Designer)

Key Points Discussed:
1. Timeline review - on track for Q3 delivery
2. Budget allocation approved
3. New feature requests from client
4. Testing phase scheduled for next month

Action Items:
□ Update project timeline (John)
□ Prepare design mockups (Mike)
□ Set up testing environment (Sarah)

Next meeting: Next Friday at 2 PM`
            }
        ];

        demoNotes.forEach((demo, index) => {
            const noteId = `note_${this.nextNoteId++}`;
            const now = new Date();
            now.setHours(now.getHours() - (index * 2)); // Stagger the times
            
            this.notes[noteId] = {
                id: noteId,
                title: demo.title,
                content: demo.content,
                dateCreated: now.toISOString(),
                dateModified: now.toISOString()
            };
        });
        
        this.saveNotesToStorage();
    }

    // Utility Functions
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSaveSuccess() {
        // Create a temporary success indicator
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1001;
            box-shadow: 0 4px 20px rgba(17, 153, 142, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        indicator.innerHTML = '<i class="fas fa-check"></i> Note saved successfully!';
        
        document.body.appendChild(indicator);
        
        // Animate in
        setTimeout(() => {
            indicator.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            indicator.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(indicator);
            }, 300);
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notepadApp = new NotepadApp();
});
